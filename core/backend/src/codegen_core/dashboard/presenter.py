"""Journal + artifacts -> the shape the run monitor consumes.

The dashboard has no store of its own. Everything it shows is reconstructed
from the two things the orchestrator already writes for audit reasons: the
append-only journal and the artifact index. That means the UI cannot show you
anything the auditor could not also see.

Field names are camelCase here because this is the wire format for a TypeScript
client; everything inside the package stays snake_case.
"""

from __future__ import annotations

import json
import os
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..core.component import Component
from ..core.tasks import tasks_for_step
from ..orchestrator.gate_revision import REVISION_EVENT, GateRevisionService

#: Which phase each step belongs to, for the coarse progress read.
PHASES: dict[str, tuple[int, ...]] = {
    "requirements": (1, 2, 3, 4, 5),
    "gate-brd": (6,),
    "design": (7, 8, 9, 10, 11),
    "build": (12, 13, 14, 15),
    "validate": (16, 17, 18, 19),
    "publish": (20, 21, 22, 23),
    "gate-merge": (24,),
}

PHASE_BY_STEP = {step: phase for phase, steps in PHASES.items() for step in steps}

#: How long a run may go without writing anything before the step it is on is
#: reported as stalled rather than running.
#:
#: Anchored to the watcher's own resume timeout, which is the longest a run is
#: allowed to take before it is killed: past that point nothing is executing,
#: because the thing that would execute it has already given up. The default
#: therefore cannot be shorter than the slowest legitimate step, which is what
#: makes it safe to treat silence as death.
STALL_AFTER_S = int(
    os.getenv("CODEGEN_STALL_AFTER_S") or os.getenv("CODEGEN_RESUME_TIMEOUT") or "900"
)

#: Events that mean a run process was alive and working at that moment.
LIVE_EVENTS = ("run_started", "retry_started", "task")

#: Events a run writes when it stops on purpose. Their presence is the
#: difference between a run that ended and one that was killed: a stall is
#: defined by the absence of any of these.
FINISHED_EVENTS = ("run_completed", "run_halted", "gate_waiting")

#: Journal statuses are orchestrator vocabulary; the UI has its own.
STATUS_MAP = {
    "OK": "SUCCESS",
    "PASSED": "SUCCESS",
    "APPROVED": "APPROVED",
    "REJECTED": "REJECTED",
    "FAILED": "FAILED",
    "BLOCKED": "BLOCKED",
    "BLOCKING_FINDINGS": "FAILED",
    "CHANGES_REQUESTED": "FAILED",
    "POLICY_VIOLATION": "FAILED",
    # Not a failure. Step 03 succeeded — it read the ticket and found it
    # underspecified, which is the one job it has, and the run stopped to ask
    # rather than to invent. Painting that red tells a reader something broke
    # and sends them looking for a defect that is not there.
    "AMBIGUOUS": "NEEDS_INPUT",
    "PENDING": "AWAITING_APPROVAL",
    "TIMEOUT": "FAILED",
}


def humanise(name: str) -> str:
    """jira_story_extraction -> Jira story extraction."""
    words = name.replace("_", " ").strip()
    fixed = re.sub(r"\b(brd|ai|dast|sast|e2e|vcs|pr|tdd|a2a)\b", lambda m: m.group(0).upper(), words)
    return fixed[:1].upper() + fixed[1:]


def first_paragraph(doc: str | None) -> str:
    """The 'why this component kind' paragraph from a step's module docstring."""
    if not doc:
        return ""
    blocks = [b.strip() for b in doc.split("\n\n") if b.strip()]
    for block in blocks:
        flat = " ".join(block.split())
        # Skip the title line and the Component/Category header.
        if flat.startswith("Step ") or flat.startswith("Component:"):
            continue
        return flat
    return " ".join(blocks[-1].split()) if blocks else ""


class RunPresenter:
    """Reads one job's on-disk state and renders it for the dashboard."""

    def __init__(self, cfg: Any, ctx: Any, registry: dict[int, Component]) -> None:
        self.cfg = cfg
        self.ctx = ctx
        self.registry = registry
        self._entries = ctx.journal.entries()
        self._index = ctx.artifacts.index()
        self._superseded = ctx.artifacts.superseded()
        self._revisions = GateRevisionService(cfg)

    # ------------------------------------------------------------------ #
    def _duration_ms(self, record: dict) -> int | None:
        """How long a step took, from the gap between journal entries.

        The journal does not store a duration field, but it is strictly ordered
        and timestamped, so the elapsed time between a step's record and the one
        before it is the step's wall clock. Reconstructed rather than recorded —
        which is why it is absent for the first entry.
        """
        try:
            position = self._entries.index(record)
        except ValueError:
            return None
        if position == 0:
            return None
        try:
            end = datetime.fromisoformat(record["at"])
            start = datetime.fromisoformat(self._entries[position - 1]["at"])
        except (KeyError, ValueError):
            return None
        return max(0, int((end - start).total_seconds() * 1000))

    def _step_records(self, step: int) -> list[dict]:
        return [e for e in self._entries if e.get("type") == "step" and e.get("step") == step]

    def _gate_dir(self) -> Path:
        return Path(self.ctx.journal.root) / "gates"

    def _decision_file(self, step: int) -> tuple[dict, bool] | None:
        """The newest decision on disk, and whether it is still the live one.

        `codegen-core approve` and the dashboard both write a decision file; the
        journal entry is only appended when the runner next reaches the gate.
        Between those two moments the decision is real and must be visible, or
        a reviewer is told to approve something they already approved.

        A decision that was answered with a replacement document is archived
        rather than deleted, and it is still worth showing: the note explaining
        why the last document was rejected is the context for reading the new
        one. It comes back marked as no longer live.
        """
        def load(path: Path) -> dict | None:
            try:
                return json.loads(path.read_text())
            except (OSError, json.JSONDecodeError):
                return None

        live = self._gate_dir() / f"{step:02d}_decision.json"
        if live.exists():
            data = load(live)
            return (data, True) if data is not None else None
        for path in sorted(self._gate_dir().glob(f"{step:02d}_decision__*.json"), reverse=True):
            data = load(path)
            if data is not None:
                return data, False
        return None

    def _approval(self, step: int) -> dict | None:
        records = [e for e in self._entries if e.get("type") == "approval" and e.get("step") == step]
        if not records:
            found = self._decision_file(step)
            if found is None:
                return None
            decision, live = found
            return {
                "gate": "BRD" if step == 6 else "PR",
                "status": decision.get("status", "PENDING"),
                "approverId": decision.get("approver_id", ""),
                "approverRole": decision.get("approver_role", ""),
                "decidedAt": decision.get("decided_at"),
                "comment": decision.get("comment", ""),
                "artifactSha256": self._gate_artifact_sha(step),
                # A live decision is queued for the runner to consume; an
                # archived one was already answered with a new document.
                "awaitingExecution": live,
                "supersededByRevision": not live,
            }
        r = records[-1]
        return {
            "gate": r.get("gate", ""),
            "status": r.get("status", "PENDING"),
            "approverId": r.get("approver_id", ""),
            "approverRole": r.get("approver_role", ""),
            "decidedAt": r.get("decided_at"),
            "comment": r.get("comment", ""),
            "artifactSha256": r.get("artifact_sha256"),
            # The decision stands, but not against the current document: a
            # replacement arrived after it, so the gate is open again.
            "supersededByRevision": self._revised_since(step, r),
        }

    def _revised_since(self, step: int, decision: dict) -> bool:
        stamp = str(decision.get("decided_at") or decision.get("at") or "")
        return any(
            e.get("type") == "event"
            and e.get("event") == REVISION_EVENT
            and e.get("step") == step
            and str(e.get("decided_at") or e.get("at") or "") > stamp
            for e in self._entries
        )

    def _gate_artifact_sha(self, step: int) -> str | None:
        """The checksum the gate request was opened against."""
        path = self._gate_dir() / f"{step:02d}_request.json"
        if not path.exists():
            return None
        try:
            shas = json.loads(path.read_text()).get("artifact_sha256") or {}
        except (OSError, json.JSONDecodeError):
            return None
        return next(iter(shas.values()), None) if isinstance(shas, dict) else None

    def _artifact_row(self, entry: dict) -> dict:
        return {
            "file": entry["file"],
            "ext": entry["ext"],
            "outputClass": entry["output_class"],
            "bytes": entry["bytes"],
            "sha256": entry["sha256"],
            # A replaced document stays readable — an auditor needs to see what
            # the run used to hold — but a reviewer must not mistake it for the
            # one under review.
            "superseded": entry["file"] in self._superseded,
            "source": entry.get("source", "pipeline"),
        }

    def _artifacts(self, step: int) -> list[dict]:
        return [self._artifact_row(e) for e in self._index if e["step"] == step]

    def _review_artifacts(self, step: int) -> list[dict]:
        """What a gate was opened against, not what the gate itself wrote.

        A gate produces only its own decision record, so a reviewer standing at
        step 06 would otherwise have nothing to read: the BRD belongs to step 05.
        The gate request names the artifacts under review, which is also what the
        checksum in the approval is taken over — so this is the same set the
        decision is bound to, resolved through the artifact index.
        """
        path = self._gate_dir() / f"{step:02d}_request.json"
        if not path.exists():
            return []
        try:
            request = json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            return []
        by_file = {e["file"]: e for e in self._index}
        rows = []
        for uri in request.get("artifacts") or []:
            entry = by_file.get(str(uri).rsplit("/", 1)[-1])
            if entry is not None:
                rows.append(self._artifact_row(entry))
        return rows

    def _revision(self, step: int) -> dict | None:
        """Whether this gate can be answered with a document, and whether it is waiting.

        `required` is what turns the dashboard's approve/reject pair into a
        single way forward: the gate stands rejected, so the only thing that
        changes its mind is a different document.
        """
        state = self._revisions.state(self.ctx, step, self._entries)
        if state is None:
            return None
        last = state["last_revision"]
        return {
            "enabled": state["enabled"],
            "required": state["required"],
            "exhausted": state["exhausted"],
            "replacesStep": state["replaces_step"],
            "acceptedExtensions": state["accepted_extensions"],
            "maxBytes": state["max_bytes"],
            "revisionsUsed": state["revisions_used"],
            "maxRevisions": state["max_revisions"],
            "lastRevision": None
            if last is None
            else {
                "file": last["file"],
                "sha256": last["sha256"],
                "uploadedBy": last["uploaded_by"],
                "uploadedRole": last["uploaded_role"],
                "at": last["at"],
                "warnings": last["warnings"],
            },
        }

    def _read_json_artifact(self, step: int) -> Any:
        """The structured output a step currently holds, if it holds one.

        Newest live artifact, not first: a step that ran twice, or whose document
        a human replaced at a gate, has more than one and only the last of them
        is what the rest of the run reads.
        """
        for entry in reversed(self._index):
            if entry["step"] == step and entry["ext"] == "json" and entry["file"] not in self._superseded:
                path = self.ctx.artifacts.local_path(entry["file"])
                try:
                    return json.loads(path.read_text())
                except (OSError, json.JSONDecodeError):
                    return None
        return None

    def _producer_of(self, schema_id: str) -> int | None:
        """Which step emitted a given schema, per the journal."""
        for e in self._entries:
            if e.get("type") == "step" and schema_id in (e.get("schemas") or []):
                return e.get("step")
        return None

    def _input_for(self, component: Component) -> Any:
        """Reconstruct what a step received from the artifacts of its producers.

        The orchestrator does not persist request envelopes, so this is a
        reconstruction rather than a recording. It is honest about that: only
        inputs that survive as artifacts appear here.
        """
        consumes = list(getattr(component, "consumes", []))
        if not consumes:
            return None
        payload: dict[str, Any] = {}
        for schema_id in consumes:
            producer = self._producer_of(schema_id)
            if producer is None:
                payload[schema_id] = {
                    "_unavailable": "No step in this run emitted this schema.",
                }
                continue
            data = self._read_json_artifact(producer)
            if data is not None:
                payload[schema_id] = data
            else:
                # Steps that write a document rather than a structured artifact
                # leave nothing to replay. Say so instead of dropping the key,
                # or the input looks smaller than it was.
                files = [a["file"] for a in self._artifacts(producer)]
                payload[schema_id] = {
                    "_unavailable": (
                        f"Step {producer:02d} wrote a document, not structured data, "
                        "so its content cannot be replayed here."
                    ),
                    "_artifacts": files,
                }
        return payload or None

    # ------------------------------------------------------------------ #
    def _status(self, step: int, component: Component) -> str:
        records = self._step_records(step)
        # A step that raised never wrote a record — the exception is the whole
        # story. Without this it reads as "still to run" while the run sits
        # blocked on it, and the reviewer is offered no way to resolve it.
        if self._errored_since(step, records[-1] if records else None):
            return "FAILED"
        if records:
            # A gate re-opened after its last run is waiting again, whatever it
            # decided last time: the document under it changed, so the old
            # decision is history rather than the gate's current state.
            if self._reopened_since(step, records[-1]):
                return "AWAITING_APPROVAL"
            return STATUS_MAP.get(records[-1].get("status", ""), "FAILED")

        # No record yet: it is either the next thing to run, or still queued.
        gate_cfg = self.cfg.gates.get(f"{step:02d}")
        if gate_cfg is not None:
            if self._pending_gate(step):
                return "AWAITING_APPROVAL"
            found = self._decision_file(step)
            if found is not None:
                return STATUS_MAP.get(found[0].get("status", ""), "AWAITING_APPROVAL")
        # Finished, not merely attempted. A gate that was rejected and a step
        # that failed both hold records, and neither means the run has moved
        # past them — reading "has a record" as done paints every later step as
        # running while the pipeline sits blocked.
        completed = {
            e["step"] for e in self._entries
            if e.get("type") == "step" and e.get("status") in ("OK", "APPROVED", "PASSED")
        }
        if all(s in completed for s in range(1, step)):
            if component.kind.value == "GATE":
                return "AWAITING_APPROVAL"
            # Next in line is not the same as under way. This branch used to
            # return RUNNING on the strength of the *previous* steps having
            # finished, which says nothing about whether a process is still
            # alive to run this one — a run killed mid-step left its successor
            # displayed as RUNNING indefinitely, with no failure for anyone to
            # retry.
            #
            # Three outcomes, not two. A run that ended on purpose — completed,
            # halted, parked at a gate — leaves this step simply not yet asked
            # for, which is what PENDING has always meant. Only a run that went
            # silent without saying anything is a stall.
            state = self._run_state()
            if state == "live":
                return "RUNNING"
            return "STALLED" if state == "stalled" else "PENDING"
        return "PENDING"

    def _run_state(self) -> str:
        """Whether a run process is working on this job: live, ended, stalled.

        Two questions, in order, because they fail differently:

        **Did it stop on purpose?** A run that completed, halted, or parked at a
        gate wrote an event saying so. Nothing is running, and no amount of
        recency changes that — but nothing is wrong either, so this is `ended`.

        **Has it gone quiet?** A killed process writes nothing at all — no halt,
        no error, no record for the step it died on. Silence is the only trace
        it leaves, so the age of the newest entry is the only evidence there is.

        Erring towards `live` on an unparseable or missing timestamp is
        deliberate: showing a working run as stalled is the more misleading of
        the two mistakes, and it resolves itself the moment the step lands.
        """
        for entry in reversed(self._entries):
            event = entry.get("event")
            if event in FINISHED_EVENTS:
                return "ended"
            if event in LIVE_EVENTS or entry.get("type") == "step":
                break
        else:
            # Nothing has ever been written, so nothing was ever started.
            return "ended"

        age = self._age_seconds(self._entries[-1].get("at"))
        return "live" if age is None or age < STALL_AFTER_S else "stalled"

    @staticmethod
    def _age_seconds(stamp: Any) -> float | None:
        """Seconds since an ISO-8601 journal timestamp, or None if unreadable."""
        if not stamp:
            return None
        try:
            when = datetime.fromisoformat(str(stamp))
        except ValueError:
            return None
        # The orchestrator writes aware timestamps; a naive one from an older
        # journal is read as UTC rather than thrown away.
        if when.tzinfo is None:
            when = when.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - when).total_seconds()

    def _pending_gate(self, step: int) -> bool:
        gate_dir = Path(self.ctx.journal.root) / "gates"
        request = gate_dir / f"{step:02d}_request.json"
        decision = gate_dir / f"{step:02d}_decision.json"
        return request.exists() and not decision.exists()

    def _errored_since(self, step: int, record: dict | None) -> bool:
        """Did this step raise, with nothing successful after it?

        A retry that clears the failure writes a fresh record, so comparing the
        error against the newest record is what distinguishes "blocked here" from
        "failed earlier and since resolved".
        """
        stamp = str((record or {}).get("at") or "")
        return any(
            e.get("type") == "event"
            and e.get("event") == "step_error"
            and e.get("step") == step
            and str(e.get("at") or "") > stamp
            for e in self._entries
        )

    def _reopened_since(self, step: int, record: dict) -> bool:
        """Was this gate re-opened after the run last passed through it?

        Only a replacement document re-opens a gate, and it archives the
        decision as it does so, hence both halves of the test: an open ticket
        with no decision beside it, raised later than the record.
        """
        if self.cfg.gates.get(f"{step:02d}") is None or not self._pending_gate(step):
            return False
        path = self._gate_dir() / f"{step:02d}_request.json"
        try:
            opened_at = str(json.loads(path.read_text()).get("opened_at") or "")
        except (OSError, json.JSONDecodeError):
            return False
        return bool(opened_at) and opened_at > str(record.get("at") or "")

    def _error(self, step: int) -> dict | None:
        for e in reversed(self._entries):
            if e.get("type") == "event" and e.get("step") == step and e.get("event") == "step_error":
                return {"code": "STEP_ERROR", "message": str(e.get("error", ""))}
        records = self._step_records(step)
        if records and records[-1].get("status") not in ("OK", "APPROVED", "PASSED"):
            status = records[-1]["status"]
            return {
                "code": status,
                "message": f"Step finished with status {status}",
                "detail": self._outcome_detail(step, status, records[-1]),
            }
        return None

    def _outcome_detail(self, step: int, status: str, record: dict) -> str:
        """What the orchestrator actually did about this status.

        This used to assert, for every non-OK status, that the run had been
        "routed through the remediation edge declared for this status". Edges
        are declared for eight (step, status) pairs and no others, so for
        everything else the sentence described a route that does not exist — and
        it said so most confidently exactly where a reader was most stuck, on a
        step whose run had halted.

        The journal knows which of the two happened, so it is asked rather than
        assumed.
        """
        edge = next(
            (
                e
                for e in self.cfg.pipeline.remediation_edges
                if e.from_step == step and e.on == status
            ),
            None,
        )
        if edge is not None:
            # Loops are journalled as their own record type, not as events.
            loops = sum(
                1
                for e in self._entries
                if e.get("type") == "loop" and e.get("from") == step and e.get("on") == status
            )
            return (
                f"The orchestrator routed this back to step {edge.to_step:02d} "
                f"(loop {min(loops, edge.max_loops)} of {edge.max_loops}). "
                "The run continues from there."
            )

        halt = next(
            (
                e
                for e in reversed(self._entries)
                if e.get("event") == "run_halted" and e.get("step") == step
            ),
            None,
        )
        if halt is not None:
            return (
                f"The run halted here: {halt.get('reason') or 'no reason recorded'}. "
                "Nothing downstream has run."
            )
        return (
            f"No remediation edge is declared for status {status} at this step, "
            "so the run stops here until a person resolves it."
        )

    def _action_intent(self, step: int) -> dict | None:
        """The step's declared intent, if it got as far as declaring one."""
        for entry in reversed(self._entries):
            if entry.get("event") == "action_intent" and entry.get("step") == step:
                return {
                    "action": entry.get("action"),
                    "justification": entry.get("justification"),
                    "targetFiles": entry.get("target_files", []),
                    "riskLevel": entry.get("risk_level"),
                }
        return None

    # ------------------------------------------------------------------ #
    def step_payload(self, step: int, component: Component) -> dict:
        records = self._step_records(step)
        last = records[-1] if records else None
        prov = (last or {}).get("provenance") or {}
        step_cfg = self.cfg.steps.get(f"{step:02d}")
        route = self.cfg.routing.steps.get(f"{step:02d}")

        payload = {
            "step": step,
            "name": component.name,
            "title": humanise(component.name),
            "category": component.category,
            "kind": component.kind.value,
            "phase": PHASE_BY_STEP.get(step, "build"),
            "capability": route.capability if route else None,
            "consumes": list(getattr(component, "consumes", [])),
            # The journal records what a step really emitted; the class attribute
            # holds filename templates, which are less useful to a reader.
            "produces": (last or {}).get("schemas") or list(getattr(component, "produces", [])),
            "rationale": first_paragraph(type(component).__module__ and component.__doc__)
            or first_paragraph(_module_doc(component)),
            "status": self._status(step, component),
            "startedAt": last.get("at") if last else None,
            "durationMs": self._duration_ms(last) if last else None,
            "attempt": max(1, len(records)),
            "provenance": {
                "backendId": prov.get("backend_id"),
                "modelId": prov.get("model_id"),
                "promptSha256": prov.get("prompt_sha256"),
                "tokensIn": prov.get("tokens_in", 0),
                "tokensOut": prov.get("tokens_out", 0),
                "costUsd": prov.get("cost_usd", 0.0),
            },
            # Why the step did it, beside what it cost. Read from the journal
            # event rather than the artifact so it is present even when the step
            # failed after declaring its intent.
            # Sub-step progress, rebuilt from the journal so a resumed run shows
            # what it already did rather than an empty checklist.
            "tasks": tasks_for_step(self._entries, step),
            "actionIntent": self._action_intent(step),
            "riskLevel": getattr(step_cfg, "risk_level", "low") if step_cfg else "low",
            "allowedActions": list(getattr(step_cfg, "allowed_actions", []) or []) if step_cfg else [],
            "artifacts": self._artifacts(step),
            "input": self._input_for(component),
            "output": self._read_json_artifact(step),
        }

        error = self._error(step)
        if error:
            payload["error"] = error

        questions = self._blocking_questions(step, payload["status"])
        if questions:
            payload["blockingQuestions"] = questions

        approval = self._approval(step)
        if approval:
            payload["approval"] = approval

        gate_cfg = self.cfg.gates.get(f"{step:02d}")
        if gate_cfg is not None:
            payload["requiredRoles"] = list(gate_cfg.required_roles)
            payload["reviewArtifacts"] = self._review_artifacts(step)
            revision = self._revision(step)
            if revision is not None:
                payload["revision"] = revision

        if step_cfg is not None and not step_cfg.enabled:
            payload["status"] = "SKIPPED"

        return payload

    def _blocking_questions(self, step: int, status: str) -> list[dict] | None:
        """The questions a halted step is waiting to have answered.

        They already exist in the step's artifact, which is precisely where a
        reader stuck on "why has this stopped" will not look. A run held up by
        five questions should show the five questions.

        Only while the step is actually holding the run: the same artifact is
        still on disk once the questions have been answered and the run has
        moved on, and showing them then would read as an outstanding demand.
        """
        if status != "NEEDS_INPUT":
            return None
        payload = self._read_json_artifact(step)
        if not isinstance(payload, dict):
            return None
        questions = [q for q in payload.get("questions_for_human", []) if isinstance(q, dict)]
        return [
            {
                "id": str(q.get("id", "")),
                "text": str(q.get("text", "")),
                "blocksStep": q.get("blocks_step"),
            }
            for q in questions
        ] or None

    # ------------------------------------------------------------------ #
    @staticmethod
    def _blocked_step(steps: list[dict]) -> int | None:
        """The earliest failed step, which is the one the run is waiting on.

        A failure stops the pipeline, so anything failed later in the list is
        from an earlier pass rather than the current obstruction — the run never
        got past the first one.
        """
        # A stalled step obstructs exactly as a failed one does: no result, and
        # nothing after it can run. Naming it here is what puts it behind the
        # header's Retry button, which is the whole point of telling the two
        # apart from RUNNING.
        # NEEDS_INPUT obstructs too: the run stopped there and nothing after it
        # runs. It differs from the other two only in what clears it — answering
        # the questions rather than pressing Retry — which is the step dialog's
        # business, not this function's.
        blocking = [
            s["step"] for s in steps if s["status"] in ("FAILED", "STALLED", "NEEDS_INPUT")
        ]
        return min(blocking) if blocking else None

    def run_payload(self) -> dict:
        steps = [self.step_payload(n, c) for n, c in sorted(self.registry.items())]
        started = next(
            (e["at"] for e in self._entries if e.get("event") == "run_started"),
            self._entries[0]["at"] if self._entries else None,
        )
        halted = any(e.get("event") == "run_halted" for e in self._entries)
        blocked = self._blocked_step(steps)
        stalled = any(s["status"] == "STALLED" for s in steps)
        needs_input = any(s["status"] == "NEEDS_INPUT" for s in steps)
        completed = any(e.get("event") == "run_completed" for e in self._entries)
        awaiting = any(s["status"] == "AWAITING_APPROVAL" for s in steps)

        story = self._read_json_artifact(1) or {}

        return {
            "jobId": self.ctx.job_id,
            "jiraId": self.ctx.jira_id,
            "title": story.get("title", self.ctx.jira_id),
            "profile": self.cfg.active_profile,
            # An open gate outranks everything else: `--stop 5` finishes cleanly
            # but the run is still waiting on a person, and a rejection that has
            # since been answered with a new document has stopped being a halt —
            # in both cases saying anything else tells the reviewer there is
            # nothing to do when there is.
            # A run holding questions ranks with an open gate: both are the
            # pipeline waiting on a person, and both are cleared by one.
            "status": "AWAITING_APPROVAL"
            if awaiting or needs_input
            else "HALTED"
            if halted
            # Below a clean halt, because a halt was recorded on purpose and
            # says why; a stall is the absence of any such record. Above
            # RUNNING, because saying a run is running when nothing is running
            # is the failure this whole distinction exists to fix.
            else "STALLED"
            if stalled
            else "COMPLETED"
            if completed
            else "RUNNING",
            # The step holding everything up, if one is. A failed step blocks
            # the whole run until a human resolves it, so the dashboard names it
            # rather than making a reader scan twenty-four rows for the red one.
            "blockedAt": blocked,
            "startedAt": started,
            "updatedAt": self._entries[-1]["at"] if self._entries else started,
            "costUsd": self.ctx.journal.total_cost_usd(),
            "budgetUsd": self.cfg.routing.budgets.per_job_usd,
            "steps": steps,
            "edges": [
                {
                    "from": e.from_step,
                    "on": e.on,
                    "to": e.to_step,
                    "maxLoops": e.max_loops,
                    "loopsUsed": self.ctx.journal.loop_count(e),
                }
                for e in self.cfg.pipeline.remediation_edges
            ],
        }


def _module_doc(component: Component) -> str | None:
    import sys

    module = sys.modules.get(type(component).__module__)
    return getattr(module, "__doc__", None)
