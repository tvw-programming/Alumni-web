"""HTTP surface for the run monitor and the two human gates.

Deliberately small. It exposes what a reviewer needs to make a decision — the
run, the artifacts behind it, and the decision endpoints — and nothing else.

Everything served here is reconstructed from the journal and the artifact
index, so the dashboard cannot show a reviewer anything an auditor could not
also reconstruct from the same files.
"""

from __future__ import annotations

import base64
import binascii
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from ..core import story_input
from ..core.config import ConfigLoader
from ..core.context import JobContext
from ..core.errors import CodeGenCoreError, DocumentRejected, RevisionNotAllowed
from ..orchestrator.gates import GateService
from ..steps._loader import load_steps
from .ambiguity_clarify import ClarificationError, clarify
from .presenter import RunPresenter


class Decision(BaseModel):
    """A human decision at one of the two gates."""

    status: str
    approverId: str
    approverRole: str
    comment: str = ""


class RetryRequest(BaseModel):
    """Who asked for a failed step to run again. Recorded in the journal."""

    requestedBy: str = "dashboard-user"


class NewRun(BaseModel):
    """A run a developer is starting by hand, from step 01.

    Nothing starts a pipeline on its own: no schedule, no webhook, no boot-time
    seed. Somebody types a story number and presses a button, and this is that
    request. Title, description and criteria are what step 01 would otherwise
    ask the tracker for; leaving them out (`useTracker`) says "fetch it".
    """

    jiraId: str
    title: str = ""
    description: str = ""
    acceptanceCriteria: list[str] = []
    #: The developer declined the form; step 01 reads the configured tracker.
    useTracker: bool = False
    startedBy: str = "dashboard-user"


class RevisionUpload(BaseModel):
    """A replacement for the document a gate rejected.

    The bytes travel base64-encoded in a JSON body rather than as multipart form
    data. Multipart would need another runtime dependency for a single endpoint,
    and this is one document per decision, not a stream: the request stays
    self-describing and `pip install -e .[dashboard]` stays enough to serve it.
    """

    filename: str
    contentBase64: str
    uploadedBy: str
    uploadedRole: str
    comment: str = ""


class ClarificationAnswer(BaseModel):
    id: str
    answer: str


class ClarifyRequest(BaseModel):
    """Answers typed on the Ambiguous step dialog."""

    answers: list[ClarificationAnswer]
    answeredBy: str = "dashboard-user"


def create_app(config_path: str | None = None, cors_origins: list[str] | None = None) -> Any:
    from fastapi import FastAPI, HTTPException
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse, PlainTextResponse

    cfg = ConfigLoader.load(config_path)
    registry = load_steps(cfg)
    gates = GateService(cfg)

    app = FastAPI(
        title="CodeGen Core run monitor",
        version="2.0.0",
        description="Read a run, inspect any step, decide at the two human gates.",
    )

    # The dashboard is served from a different origin in development.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_origins or ["http://localhost:5173", "http://127.0.0.1:5173"],
        allow_credentials=True,
        allow_methods=["GET", "POST"],
        allow_headers=["*"],
    )

    def ctx_for(job_id: str) -> JobContext:
        runs_root = Path(cfg.app.paths.runs.format(job_id=job_id))
        if not runs_root.exists():
            raise HTTPException(404, f"No run named {job_id}")
        jira = job_id.rsplit("-", 1)[0] if "-" in job_id else job_id
        return JobContext.create(cfg, jira, job_id=job_id)

    # ------------------------------------------------------------------ #
    #: The runs template ends in {job_id}; substitute a probe to get the parent.
    runs_root = Path(cfg.app.paths.runs.format(job_id="__probe__")).parent

    @app.get("/api/runs", summary="List every run on disk, newest first")
    def list_runs() -> list[dict]:
        root = runs_root
        if not root.exists():
            return []
        out = []
        for path in sorted(root.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
            if (path / "journal.ndjson").exists():
                out.append({"jobId": path.name, "updatedAt": path.stat().st_mtime})
        return out

    @app.post("/api/runs", summary="Start a run at step 01", status_code=201)
    def start_run(body: NewRun) -> dict:
        """Create a job and ask for it to begin.

        The pipeline is developer-initiated by design: this endpoint is the only
        way the dashboard can begin one, and nothing calls it but a person. As
        with every other action here, the API records the intent and the watcher
        executes it — a run takes minutes and calls models, so it does not
        belong inside an HTTP request.
        """
        jira = body.jiraId.strip()
        if not jira:
            raise HTTPException(400, "A Jira story number is required to start a run")

        ctx = JobContext.create(cfg, jira)
        if not body.useTracker:
            try:
                story_input.save(
                    ctx,
                    {
                        "key": jira,
                        "title": body.title,
                        "description": body.description,
                        "acceptance_criteria": body.acceptanceCriteria,
                        "entered_by": body.startedBy,
                    },
                )
            except CodeGenCoreError as exc:
                # The job directory exists but nothing has run in it; saying why
                # beats starting a run that would die at step 01.
                raise HTTPException(422, str(exc)) from exc

        source = "the configured tracker" if body.useTracker else "the details you entered"
        ctx.journal.append_event(
            "run_requested",
            jira_id=jira,
            started_by=body.startedBy,
            story_source="tracker" if body.useTracker else "manual",
        )
        return {
            "jobId": ctx.job_id,
            "run": RunPresenter(cfg, ctx, registry).run_payload(),
            "message": f"Run {ctx.job_id} starting at step 01 from {source}.",
        }

    @app.get("/api/runs/{job_id}", summary="The full run, as the monitor renders it")
    def get_run(job_id: str) -> dict:
        ctx = ctx_for(job_id)
        return RunPresenter(cfg, ctx, registry).run_payload()

    @app.get("/api/runs/{job_id}/steps/{step}", summary="One step in detail")
    def get_step(job_id: str, step: int) -> dict:
        ctx = ctx_for(job_id)
        component = registry.get(step)
        if component is None:
            raise HTTPException(404, f"Step {step:02d} is not in this pipeline")
        return RunPresenter(cfg, ctx, registry).step_payload(step, component)

    @app.get("/api/runs/{job_id}/artifacts", summary="Artifact index with checksums")
    def artifacts(job_id: str) -> list[dict]:
        return ctx_for(job_id).artifacts.index()

    @app.get("/api/runs/{job_id}/artifacts/{filename}", summary="Download one artifact")
    def artifact(job_id: str, filename: str):
        ctx = ctx_for(job_id)
        # The index knows which story folder the file went into; resolving
        # through it keeps the layout an implementation detail of the store.
        path = ctx.artifacts.local_path(filename).resolve()
        root = ctx.artifacts.root.resolve()
        # Never serve outside the job's own artifact directory.
        if root not in path.parents or not path.is_file():
            raise HTTPException(404, "No such artifact")
        if path.suffix in (".json", ".md", ".diff"):
            return PlainTextResponse(path.read_text(errors="replace"))
        return FileResponse(path)

    @app.get("/api/runs/{job_id}/gates", summary="Gates still waiting on a human")
    def pending_gates(job_id: str) -> list[dict]:
        return gates.pending(ctx_for(job_id))

    @app.get("/api/runs/{job_id}/journal", summary="The append-only audit record")
    def journal(job_id: str, limit: int = 500) -> list[dict]:
        return ctx_for(job_id).journal.entries()[-limit:]

    # ------------------------------------------------------------------ #
    @app.post("/api/runs/{job_id}/steps/{step}/decision", summary="Approve or reject a gate")
    def decide(job_id: str, step: int, body: Decision) -> dict:
        ctx = ctx_for(job_id)
        if body.status not in ("APPROVED", "REJECTED"):
            raise HTTPException(400, "status must be APPROVED or REJECTED")
        try:
            gates.decide(ctx, step, body.status, body.approverId, body.approverRole, body.comment)
        except PermissionError as exc:
            raise HTTPException(403, str(exc)) from exc
        except RevisionNotAllowed as exc:
            # The gate stands rejected: it is waiting for a document, not a
            # second decision about the one it already turned down.
            raise HTTPException(409, str(exc)) from exc
        except ValueError as exc:
            raise HTTPException(400, str(exc)) from exc
        return {
            "run": RunPresenter(cfg, ctx, registry).run_payload(),
            "message": f"Step {step:02d} {body.status.lower()}. Recorded against the artifact checksum.",
        }

    @app.post(
        "/api/runs/{job_id}/steps/{step}/revision",
        summary="Replace the document a gate rejected, and re-open the gate against it",
    )
    def revise(job_id: str, step: int, body: RevisionUpload) -> dict:
        """The way forward from a rejection.

        A rejected gate has no remediation edge: the model would produce the same
        document from the same inputs. What moves the run on is a different
        document, so the reviewer supplies one. It supersedes the artifact under
        review, the gate re-opens bound to the new checksum, and the run waits
        for a fresh decision — it does not resume on the strength of the upload.
        """
        ctx = ctx_for(job_id)
        policy = gates.revisions.policy(step)
        if policy is None:
            raise HTTPException(404, f"Gate {step:02d} does not accept a replacement document")
        # Reject an oversized body before decoding it into memory. Base64 costs
        # four bytes per three, plus room for the rest of the JSON envelope.
        if len(body.contentBase64) > policy.max_bytes * 4 // 3 + 4096:
            raise HTTPException(413, f"The document exceeds {policy.max_bytes:,} bytes")
        try:
            data = base64.b64decode(body.contentBase64, validate=True)
        except (binascii.Error, ValueError) as exc:
            raise HTTPException(400, "contentBase64 is not valid base64") from exc

        try:
            record = gates.revise(
                ctx,
                step,
                filename=body.filename,
                data=data,
                uploaded_by=body.uploadedBy,
                uploaded_role=body.uploadedRole,
                comment=body.comment,
            )
        except PermissionError as exc:
            raise HTTPException(403, str(exc)) from exc
        except RevisionNotAllowed as exc:
            raise HTTPException(409, str(exc)) from exc
        except DocumentRejected as exc:
            raise HTTPException(422, str(exc)) from exc

        return {
            "run": RunPresenter(cfg, ctx, registry).run_payload(),
            "message": (
                f"{record['file']} replaced the step {record['replaces_step']:02d} document. "
                f"Gate {step:02d} is open again and bound to its checksum."
            ),
            "warnings": record["warnings"],
        }

    @app.post("/api/runs/{job_id}/steps/{step}/retry", summary="Re-run a failed step from the beginning")
    def retry(job_id: str, step: int, body: RetryRequest) -> dict:
        """Ask for one failed step to run again.

        Intent, not execution: the request records what was asked and returns,
        and the watcher runs `codegen-core retry` in a subprocess. A step can take
        minutes and calls a model, neither of which belongs in a web request —
        and recording it means the ask survives an API restart.

        Only a failed step is accepted. Retrying a step that succeeded would
        spend tokens reproducing a document that is already correct, and the
        rest of the run is built on the version that exists.
        """
        ctx = ctx_for(job_id)
        component = registry.get(step)
        if component is None:
            raise HTTPException(404, f"Step {step:02d} is not in this pipeline")

        presenter = RunPresenter(cfg, ctx, registry)
        status = presenter.step_payload(step, component)["status"]
        if status != "FAILED":
            raise HTTPException(
                409,
                f"Step {step:02d} is {status.replace('_', ' ').lower()}, not failed. "
                "Retry re-runs a step that failed; there is nothing here to resolve.",
            )

        ctx.journal.append_event("retry_requested", step=step, requested_by=body.requestedBy)
        return {
            "run": RunPresenter(cfg, ctx, registry).run_payload(),
            "message": (
                f"Step {step:02d} is running again from the beginning. "
                "The run continues from there once it clears."
            ),
        }

    @app.post(
        "/api/runs/{job_id}/steps/{step}/clarify",
        summary="Answer ambiguity questions and resume from step 01",
    )
    def clarify_step(job_id: str, step: int, body: ClarifyRequest) -> dict:
        """The on-screen answer path for a NEEDS_INPUT (AMBIGUOUS) step.

        Writes the answers into story_input.json, invalidates steps 01..step,
        and records clarification_requested so the watcher resumes the run.
        """
        ctx = ctx_for(job_id)
        component = registry.get(step)
        if component is None:
            raise HTTPException(404, f"Step {step:02d} is not in this pipeline")

        presenter = RunPresenter(cfg, ctx, registry)
        try:
            record = clarify(
                ctx,
                step=step,
                answers=[a.model_dump() for a in body.answers],
                answered_by=body.answeredBy,
                presenter=presenter,
                component=component,
            )
        except ClarificationError as exc:
            raise HTTPException(409, str(exc)) from exc
        except CodeGenCoreError as exc:
            raise HTTPException(422, str(exc)) from exc

        return {
            "run": RunPresenter(cfg, ctx, registry).run_payload(),
            "message": (
                f"Recorded answers for {', '.join(record['questionIds'])}. "
                f"Steps {', '.join(f'{s:02d}' for s in record['invalidated']) or 'none'} "
                "will re-run with the clarified story."
            ),
        }

    @app.get("/api/visual/variants", summary="Visualisation variants defined in config")
    def visual_variants() -> dict:
        """How the dashboard may draw a run.

        The variants live in config.json so a new domain metaphor is a JSON
        block rather than a code change, the same rule vendors follow. Keys are
        camelCased here because this is the wire format for a TypeScript client.
        """
        def camel(name: str) -> str:
            head, *rest = name.split("_")
            return head + "".join(word.title() for word in rest)

        return {
            "default": cfg.visualization.default_variant,
            "variants": {
                variant_id: {
                    **{camel(k): v for k, v in variant.model_dump(exclude={"palette"}).items()},
                    "id": variant_id,
                    "palette": {camel(k): v for k, v in variant.palette.model_dump().items()},
                }
                for variant_id, variant in cfg.visualization.variants.items()
            },
        }

    @app.get("/api/health", summary="Liveness and configuration summary")
    def health() -> dict:
        project = cfg.app.project
        ui_url = (project.ui_url or "").strip()
        return {
            "ok": True,
            "profile": cfg.active_profile,
            "steps": len(registry),
            "gates": sorted(cfg.gates),
            "backends": sorted(b for b, c in cfg.backends.items() if c.enabled),
            "projectUi": (
                {
                    "url": ui_url,
                    "label": (project.ui_label or "Product UI").strip() or "Product UI",
                }
                if ui_url
                else None
            ),
        }

    return app


def main() -> None:  # pragma: no cover - entry point
    import uvicorn

    uvicorn.run(create_app(), host="127.0.0.1", port=8000)


if __name__ == "__main__":  # pragma: no cover
    main()
