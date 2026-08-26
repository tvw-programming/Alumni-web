"""Append-only run journal.

Every envelope in and out, every approval, every remediation loop is appended as
one JSON line. Nothing is ever mutated or deleted. This is what makes a run
resumable and auditable, and it is where the router looks to enforce reviewer
isolation ("which model wrote step 12?").
"""

from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .envelope import Envelope


class Journal:
    def __init__(self, cfg: Any, job_id: str) -> None:
        self.job_id = job_id
        self.root = Path(cfg.app.paths.runs.format(job_id=job_id))
        self.root.mkdir(parents=True, exist_ok=True)
        self.path = self.root / "journal.ndjson"
        self.path.touch(exist_ok=True)

    # ------------------------------------------------------------------ #
    def _append(self, record: dict) -> None:
        record["at"] = datetime.now(UTC).isoformat()
        with self.path.open("a") as fh:
            fh.write(json.dumps(record, default=str) + "\n")

    def entries(self) -> list[dict]:
        if not self.path.exists():
            return []
        return [json.loads(line) for line in self.path.read_text().splitlines() if line.strip()]

    # ------------------------------------------------------------------ #
    def append(self, env_in: Envelope, env_out: Envelope) -> None:
        self._append(
            {
                "type": "step",
                "step": env_out.sender.step,
                "component": env_out.sender.name,
                "kind": env_out.sender.kind,
                "status": env_out.status,
                "intent": env_out.intent.value,
                "request_id": env_in.message_id,
                "message_id": env_out.message_id,
                "schemas": env_out.schema_ids(),
                "provenance": env_out.provenance.model_dump(mode="json"),
            }
        )

    def append_approval(self, step: int, decision: dict) -> None:
        self._append({"type": "approval", "step": step, **decision})

    def append_event(self, kind: str, **fields: Any) -> None:
        self._append({"type": "event", "event": kind, **fields})

    def record_loop(self, edge: Any) -> None:
        self._append(
            {"type": "loop", "from": edge.from_step, "to": edge.to_step, "on": edge.on}
        )

    # ------------------------------------------------------------------ #
    #: Statuses that mean a step is done and must not be run again.
    DONE = ("OK", "APPROVED", "PASSED")

    def completed_steps(self) -> set[int]:
        return {
            e["step"]
            for e in self.entries()
            if e.get("type") == "step" and e.get("status") in self.DONE and e.get("step") is not None
        }

    def completed(self, step: int) -> bool:
        return step in self.completed_steps()

    def loop_count(self, edge: Any) -> int:
        return sum(
            1
            for e in self.entries()
            if e.get("type") == "loop" and e.get("from") == edge.from_step and e.get("on") == edge.on
        )

    def model_used(self, step: int) -> str | None:
        """Which model id executed a step - drives reviewer isolation."""
        for e in reversed(self.entries()):
            if e.get("type") == "step" and e.get("step") == step:
                return (e.get("provenance") or {}).get("model_id")
        return None

    def total_cost_usd(self) -> float:
        return round(
            sum(
                (e.get("provenance") or {}).get("cost_usd", 0.0)
                for e in self.entries()
                if e.get("type") == "step"
            ),
            4,
        )

    def last_step(self) -> int | None:
        steps = [e.get("step") for e in self.entries() if e.get("type") == "step"]
        return max((s for s in steps if s is not None), default=None)
