"""Step 06 - BRD Approval. MANDATORY HUMAN GATE.

Component: GATE                 Category: Human-in-the-loop control

Nothing implementation-related may proceed until a human approves the BRD.
Three properties make this a real control rather than a speed bump:

  1. It cannot be disabled. config.assert_invariants() rejects any config where
     step 06 is missing, disabled, or not a gate. That check lives in Python, so
     no JSON edit and no profile overlay can reach it.
  2. The approval is bound to bytes. artifact_sha256 records the exact BRD that
     was approved; regenerating the BRD invalidates its own approval.
  3. The wait survives a restart. The decision is a file, so a crashed
     orchestrator resumes waiting instead of losing the signature.

Note `step = 6`, not `06` - a leading zero is an invalid int literal in Python.
The zero padding lives in filenames and artifact names only.
"""

from __future__ import annotations

from typing import Any

from ..core.component import Gate
from ..core.envelope import Envelope, Intent
from ..core.parts import structured
from ..plugins.factory import build_plugin


class BrdApprovalGate(Gate):
    step = 6
    name = "brd_human_gate"
    category = "Human-in-the-loop control (mandatory)"
    consumes = ["BrdV1"]
    produces = ["06_brd_approval__{job}__v{v}.json"]
    accepts = ["*/*"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        gate_cfg = ctx.cfg.gates["06"]
        self.required_roles = gate_cfg.required_roles
        dash = build_plugin(ctx.cfg, "dashboard", ctx)

        artifacts = ctx.artifacts.of_step(5)
        dash.open_gate(ctx, self.step, artifacts, gate_cfg)
        ctx.journal.append_event("gate_opened", step=self.step, gate=gate_cfg.name,
                                 artifacts=artifacts)

        decision = dash.decision_or_none(ctx, self.step, gate_cfg)
        if decision is None:
            # Nobody has decided yet. The ticket is open and every byte of state
            # is on disk, so the run stops here and the decision starts the next
            # one — rather than holding a process open for however long a human
            # takes, which on this gate's timeout is a week.
            return env.reply(
                self.ref(), [], intent=Intent.GATE_WAIT, status="PENDING",
            )

        record = {
            "gate": "BRD",
            "status": decision["status"],
            "approver_id": decision.get("approver_id", ""),
            "approver_role": decision.get("approver_role", ""),
            "decided_at": decision.get("decided_at"),
            "comment": decision.get("comment", ""),
            "artifact_sha256": ctx.artifacts.sha_of(artifacts[0]) if artifacts else None,
        }
        ctx.journal.append_approval(self.step, record)
        ctx.remember("ApprovalRecordV1", record)
        ctx.artifacts.write(self.step, "brd_approval", record, ext="json")

        approved = record["status"] == "APPROVED"
        return env.reply(
            self.ref(),
            [structured("ApprovalRecordV1", record)],
            intent=Intent.RESULT if approved else Intent.ERROR,
            status=record["status"],
        )


STEP = BrdApprovalGate()
