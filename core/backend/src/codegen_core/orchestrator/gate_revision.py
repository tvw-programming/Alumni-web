"""Answering a rejected gate with a document instead of another model run.

A rejection at gate 06 is a statement about the BRD, not about the run: the
model read the same story, the same analysis and the same project context, so
asking it again produces the same document. The useful answer is a different
document, and the person who rejected it is the person who knows what it should
say. This module lets them supply it.

The rules it enforces are the gate's own rules, applied to a human's file:

  * a replacement is only accepted while the gate stands rejected — never as a
    way to swap the document out from under an approval that already happened
  * the upload must parse into the schema the pipeline traces against, so a
    hand-written BRD constrains steps 07, 13 and 23 exactly as a generated one
  * nothing is overwritten. The new document supersedes the old one, both stay
    on disk, and the journal records who replaced what with what
  * replacements are bounded by config, like every other loop in the pipeline

State transition, from the run's point of view:

    06 AWAITING_APPROVAL --reject--> 06 REJECTED, run halts
    06 REJECTED --revise--> step 05 artifacts superseded, decision archived,
                            gate re-opened against the new bytes
    06 AWAITING_APPROVAL --approve--> run resumes at 07 with the human's BRD
"""

from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from ..core.errors import DocumentRejected, RevisionNotAllowed
from ..core.telemetry import log
from ..plugins.factory import build_plugin
from ..tools.brd_parse import parse_brd_markdown
from ..tools.doc_extract import extract_markdown

#: Schema id -> parser for a human-supplied document. A gate configured with a
#: schema the pipeline cannot read back is a configuration error, not a silent
#: acceptance: an unparsed document would stop constraining anything downstream.
PARSERS = {"BrdV1": parse_brd_markdown}

#: Journal event names, kept here so the presenter and the watcher agree on them.
REVISION_EVENT = "gate_revision"
REOPENED_EVENT = "gate_reopened"


def _at(record: dict) -> str:
    """When a journal record or decision happened, preferring the decided time."""
    return str(record.get("decided_at") or record.get("at") or "")


class GateRevisionService:
    """Replace the document a gate rejected, and re-open the gate against it."""

    def __init__(self, cfg: Any) -> None:
        self.cfg = cfg

    # ------------------------------------------------------------------ #
    def policy(self, step: int) -> Any | None:
        gate = self.cfg.gates.get(f"{step:02d}")
        if gate is None or not gate.revision.enabled:
            return None
        return gate.revision

    def state(self, ctx: Any, step: int, entries: list[dict] | None = None) -> dict | None:
        """What the dashboard needs to know about this gate's revision path.

        None where the gate does not accept replacements at all, so a caller can
        tell "not offered" apart from "offered and currently unavailable".
        """
        policy = self.policy(step)
        if policy is None:
            return None

        records = ctx.journal.entries() if entries is None else entries
        revisions = [
            e for e in records
            if e.get("type") == "event" and e.get("event") == REVISION_EVENT and e.get("step") == step
        ]
        rejected_at = self._rejected_at(ctx, step, records)
        revised_at = _at(revisions[-1]) if revisions else ""
        # A rejection newer than the last replacement is one still waiting for a
        # document; a replacement newer than the last rejection has been answered.
        required = bool(rejected_at) and rejected_at > revised_at
        used = len(revisions)

        return {
            "enabled": True,
            "required": required and used < policy.max_revisions,
            "exhausted": required and used >= policy.max_revisions,
            "replaces_step": policy.replaces_step,
            "accepted_extensions": list(policy.accepted_extensions),
            "max_bytes": policy.max_bytes,
            "revisions_used": used,
            "max_revisions": policy.max_revisions,
            "last_revision": self._summarise(revisions[-1]) if revisions else None,
        }

    def _rejected_at(self, ctx: Any, step: int, records: list[dict]) -> str:
        """When this gate was last rejected, whether or not the runner has read it.

        The dashboard writes a decision file and the journal only learns about it
        when the runner next reaches the gate, so both are consulted: a reviewer
        who has just pressed Reject must be offered the way forward immediately.
        """
        stamps = [
            _at(e) for e in records
            if e.get("type") == "approval" and e.get("step") == step and e.get("status") == "REJECTED"
        ]
        decision = build_plugin(self.cfg, "dashboard", ctx).last_decision(ctx, step)
        if decision and decision.get("status") == "REJECTED":
            stamps.append(_at(decision))
        return max(stamps, default="")

    @staticmethod
    def _summarise(event: dict) -> dict:
        return {
            "file": event.get("file", ""),
            "sha256": event.get("sha256", ""),
            "uploaded_by": event.get("uploaded_by", ""),
            "uploaded_role": event.get("uploaded_role", ""),
            "at": _at(event),
            "warnings": list(event.get("warnings") or []),
        }

    # ------------------------------------------------------------------ #
    def revise(
        self,
        ctx: Any,
        step: int,
        *,
        filename: str,
        data: bytes,
        uploaded_by: str,
        uploaded_role: str,
        comment: str = "",
    ) -> dict:
        """Replace the rejected document and re-open the gate against the new one.

        Raises RevisionNotAllowed when the gate state forbids it and
        DocumentRejected when the file itself cannot stand in for the old one.
        Both messages are written for the person holding the file.
        """
        policy = self.policy(step)
        if policy is None:
            raise RevisionNotAllowed(
                f"gate {step:02d} does not accept a replacement document"
            )

        # Replacing the document under review decides what the gate is asked
        # about, so it is bounded by the same roles that may decide the gate.
        gate_cfg = self.cfg.gates[f"{step:02d}"]
        if gate_cfg.required_roles and uploaded_role not in gate_cfg.required_roles:
            raise PermissionError(
                f"role '{uploaded_role}' cannot replace the document at gate {step:02d}; "
                f"needs one of {gate_cfg.required_roles}"
            )

        state = self.state(ctx, step)
        if state["exhausted"]:
            raise RevisionNotAllowed(
                f"gate {step:02d} has already been answered with {state['revisions_used']} "
                f"replacement documents, the configured limit. The run needs a decision or "
                "an escalation, not another draft."
            )
        if not state["required"]:
            raise RevisionNotAllowed(
                f"gate {step:02d} is not waiting for a replacement document. A document is "
                "only accepted while the gate stands rejected, so that nothing can be "
                "substituted underneath a decision that has already been taken."
            )

        ext = self._check_upload(filename, data, policy)
        markdown = extract_markdown(data, ext)
        payload, warnings = self._parse(markdown, policy)

        uris = self._write(ctx, policy, ext=ext, raw=data, markdown=markdown, payload=payload)

        record = {
            "step": step,
            "replaces_step": policy.replaces_step,
            "file": uris["primary"].rsplit("/", 1)[-1],
            "sha256": ctx.artifacts.sha_of(uris["primary"]),
            "artifacts": list(uris["written"]),
            "supersedes": list(uris["superseded"]),
            "uploaded_filename": filename,
            "uploaded_by": uploaded_by,
            "uploaded_role": uploaded_role,
            "comment": comment,
            "bytes": len(data),
            "warnings": warnings,
            "decided_at": datetime.now(UTC).isoformat(),
        }
        ctx.journal.append_event(REVISION_EVENT, **record)

        # Only now is the gate re-opened: if anything above failed, the gate is
        # still rejected and the run is still stopped, which is the safe state.
        reopened = self._reopen(ctx, step)
        log.info(
            "gate document replaced",
            extra={"extra_fields": {"step": step, "file": record["file"], "by": uploaded_by}},
        )
        return {**record, "reopened_against": reopened}

    # ------------------------------------------------------------------ #
    def _check_upload(self, filename: str, data: bytes, policy: Any) -> str:
        if not data:
            raise DocumentRejected("the uploaded file is empty")
        if len(data) > policy.max_bytes:
            raise DocumentRejected(
                f"the file is {len(data):,} bytes; this gate accepts at most "
                f"{policy.max_bytes:,}"
            )
        ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
        if ext not in policy.accepted_extensions:
            raise DocumentRejected(
                f"'.{ext or filename}' is not accepted here; upload one of "
                + ", ".join(f".{e}" for e in policy.accepted_extensions)
            )
        return ext

    @staticmethod
    def _parse(markdown: str, policy: Any) -> tuple[dict | None, list[str]]:
        if not policy.schema_id:
            return None, []
        parser = PARSERS.get(policy.schema_id)
        if parser is None:
            raise RevisionNotAllowed(
                f"no parser for {policy.schema_id}; this gate cannot read a document back "
                "into the contract the pipeline traces against"
            )
        parsed = parser(markdown)
        return parsed.brd.model_dump(mode="json"), list(parsed.warnings)

    def _write(
        self, ctx: Any, policy: Any, *, ext: str, raw: bytes, markdown: str, payload: dict | None
    ) -> dict:
        """Write the replacement, superseding every live artifact it stands in for.

        The uploaded bytes are kept verbatim when they are already a document
        format: a reviewer approves what they uploaded, not a re-rendering of it.
        A markdown upload is rendered into the formats the replaced step declares,
        because the artifact rules ask that step for a document class output.
        """
        target = policy.replaces_step
        superseded = [
            entry["file"]
            for entry in ctx.artifacts.live_index()
            if entry["step"] == target and entry["slug"] == policy.slug
        ]
        written: list[str] = []

        def write(body: bytes | str | dict, *, ext_: str, output_class: str | None = None) -> str:
            uri = ctx.artifacts.write(
                target, policy.slug, body,
                ext=ext_,
                output_class=output_class,
                variant=policy.variant,
                # Every write in this batch replaces the whole previous document,
                # so the first one retires it and the rest join the live set.
                supersedes=superseded if not written else [],
                source="human_upload",
            )
            written.append(uri)
            return uri

        md_uri = write(markdown, ext_="md", output_class="specification")
        primary = md_uri

        if ext in ("pdf", "docx"):
            primary = write(raw, ext_=ext, output_class="document")
        else:
            from ..tools.doc_render import render

            for fmt in ctx.cfg.step_cfg(target).render_documents:
                write(render(markdown, fmt), ext_=fmt, output_class="document")

        if payload is not None:
            write(payload, ext_="json", output_class="structured")
            # Downstream steps read the typed artifact, not the document, so the
            # in-memory contract has to move with it or step 07 would design
            # tests against the criteria the reviewer just replaced.
            ctx.remember(policy.schema_id, payload)

        return {"primary": primary, "written": written, "superseded": superseded}

    def _reopen(self, ctx: Any, step: int) -> list[str]:
        """Retire the rejection and re-open the gate against the current document."""
        gate_cfg = self.cfg.gates[f"{step:02d}"]
        dash = build_plugin(self.cfg, "dashboard", ctx)
        dash.archive_decision(ctx, step)

        artifacts = ctx.artifacts.of_step(gate_cfg.revision.replaces_step)
        dash.open_gate(ctx, step, artifacts, gate_cfg)
        ctx.journal.append_event(REOPENED_EVENT, step=step, gate=gate_cfg.name, artifacts=artifacts)
        return artifacts
