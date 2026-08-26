"""Human-in-the-loop gate backing.

Two drivers share one class:
  fastapi - the gate ticket is served by the dashboard and polled
  cli     - the gate is decided at the terminal, for local runs

A gate ticket is a file under runs/<job>/gates/. The runner blocks until a
decision file appears, which means gate state survives a process restart: a
crashed orchestrator resumes waiting rather than losing the approval.
"""

from __future__ import annotations

import json
import os
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from .base import BasePlugin


class DashboardPlugin(BasePlugin):
    capability = "dashboard"
    driver = "fastapi"

    def _gate_dir(self, ctx: Any) -> Path:
        d = Path(ctx.journal.root) / "gates"
        d.mkdir(parents=True, exist_ok=True)
        return d

    # ------------------------------------------------------------------ #
    def open_gate(self, ctx: Any, step: int, artifacts: list[str], gate_cfg: Any) -> Path:
        ticket = self._gate_dir(ctx) / f"{step:02d}_request.json"
        ticket.write_text(
            json.dumps(
                {
                    "job_id": ctx.job_id, "jira_id": ctx.jira_id, "step": step,
                    "gate": gate_cfg.name, "required_roles": gate_cfg.required_roles,
                    "quorum": gate_cfg.quorum, "artifacts": artifacts,
                    "artifact_sha256": {a: ctx.artifacts.sha_of(a) for a in artifacts},
                    "opened_at": datetime.now(UTC).isoformat(),
                    "reminder_after_hours": gate_cfg.reminder_after_hours,
                    "escalate_after_hours": gate_cfg.escalate_after_hours,
                },
                indent=2,
            )
        )
        return ticket

    def decision_path(self, ctx: Any, step: int) -> Path:
        return self._gate_dir(ctx) / f"{step:02d}_decision.json"

    def request(self, ctx: Any, step: int) -> dict | None:
        """The open gate ticket, if there is one."""
        path = self._gate_dir(ctx) / f"{step:02d}_request.json"
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            return None

    def last_decision(self, ctx: Any, step: int) -> dict | None:
        path = self.decision_path(ctx, step)
        if not path.exists():
            return None
        try:
            return json.loads(path.read_text())
        except (OSError, json.JSONDecodeError):
            return None

    def archive_decision(self, ctx: Any, step: int) -> Path | None:
        """Retire a decision that has been answered, keeping the file.

        Deleting it would lose the signature; leaving it in place would make the
        gate look decided when it is waiting again. Renaming does both jobs: the
        gate is open, and the superseded decision is still on disk beside it.
        """
        path = self.decision_path(ctx, step)
        if not path.exists():
            return None
        stamp = datetime.now(UTC).strftime("%Y%m%dT%H%M%S%f")
        archived = self._gate_dir(ctx) / f"{step:02d}_decision__{stamp}.json"
        path.rename(archived)
        return archived

    def decision_or_none(self, ctx: Any, step: int, gate_cfg: Any) -> dict | None:
        """The decision at this gate, if there is one to read right now.

        A gate is a stop, not a sleep. The run that reaches one exits, and the
        decision — whenever it comes, minutes or days later — is what starts the
        next run. Holding a process open for a week would tie up the executor
        against a human who has gone home, and gains nothing: the whole state is
        on disk precisely so the wait costs nothing to hold.

        `CODEGEN_AUTO_APPROVE` still short-circuits it, which is how CI and the
        smoke test drive all twenty-four steps in one process.
        """
        path = self.decision_path(ctx, step)
        if path.exists():
            try:
                return json.loads(path.read_text())
            except (OSError, json.JSONDecodeError):
                return None

        auto = os.getenv("CODEGEN_AUTO_APPROVE")
        if not auto:
            return None
        decision = {
            "status": "APPROVED" if auto not in ("0", "false", "reject") else "REJECTED",
            "approver_id": f"auto:{os.getenv('USER', 'ci')}",
            "approver_role": gate_cfg.required_roles[0] if gate_cfg.required_roles else "unknown",
            "decided_at": datetime.now(UTC).isoformat(),
            "comment": "CODEGEN_AUTO_APPROVE was set - non-interactive run",
        }
        path.write_text(json.dumps(decision, indent=2))
        return decision

    def block_until_decision(
        self, ctx: Any, step: int, gate_cfg: Any, poll_s: float = 2.0, timeout_s: int | None = None
    ) -> dict:
        """Wait for a human, polling. Used where a caller genuinely wants to sit
        on the gate — a foreground CLI run — rather than exit and be resumed."""
        path = self.decision_path(ctx, step)
        auto = os.getenv("CODEGEN_AUTO_APPROVE")

        if path.exists():
            return json.loads(path.read_text())

        if auto:
            decision = {
                "status": "APPROVED" if auto not in ("0", "false", "reject") else "REJECTED",
                "approver_id": f"auto:{os.getenv('USER', 'ci')}",
                "approver_role": gate_cfg.required_roles[0] if gate_cfg.required_roles else "unknown",
                "decided_at": datetime.now(UTC).isoformat(),
                "comment": "CODEGEN_AUTO_APPROVE was set - non-interactive run",
            }
            path.write_text(json.dumps(decision, indent=2))
            return decision

        deadline = time.monotonic() + timeout_s if timeout_s else None
        while True:
            if path.exists():
                return json.loads(path.read_text())
            if deadline and time.monotonic() > deadline:
                return {"status": "TIMEOUT", "approver_id": "", "approver_role": "",
                        "decided_at": datetime.now(UTC).isoformat(), "comment": "gate timed out"}
            time.sleep(poll_s)

    # ------------------------------------------------------------------ #
    def record_decision(
        self, ctx: Any, step: int, status: str, approver_id: str, role: str, comment: str = ""
    ) -> dict:
        """Used by `codegen-core approve` and by the dashboard API."""
        decision = {
            "status": status, "approver_id": approver_id, "approver_role": role,
            "decided_at": datetime.now(UTC).isoformat(), "comment": comment,
        }
        self.decision_path(ctx, step).write_text(json.dumps(decision, indent=2))
        return decision

    def pending(self, ctx: Any) -> list[dict]:
        out = []
        for req in sorted(self._gate_dir(ctx).glob("*_request.json")):
            step = int(req.name[:2])
            if not self.decision_path(ctx, step).exists():
                out.append(json.loads(req.read_text()))
        return out
