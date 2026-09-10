"""Step 24 - Human PR Review, Merge, Release Notes. MANDATORY HUMAN GATE.

Component: GATE + PLUGIN        Category: HITL Approval / Merge / Release

The second control that cannot be configured away. A human reads the PR - which
carries the whole audit package from step 22 - and decides. Only after APPROVED
does anything merge.

`block_if_open_findings` means an approval cannot override an unresolved
blocking security finding by accident; that requires the explicit override path
in config.policy.override, which is role-restricted and audited. It lives in
`orchestrator.overrides`, and waives one occurrence for this job only.

Release notes are generated after the merge decision, from artifacts rather than
from the diff, so they describe intent rather than mechanics.
"""

from __future__ import annotations

from typing import Any

from ..core.component import Gate
from ..core.envelope import Envelope, Intent
from ..core.parts import structured
from ..orchestrator.overrides import waived_refs
from ..plugins.factory import build_plugin
from ..schemas.security import finding_ref


class HumanReviewMergeRelease(Gate):
    step = 24
    name = "human_review_merge_release"
    category = "HITL Approval / Merge / Release"
    consumes = ["PullRequestV1", "AiReviewV1", "SecurityScanV1"]
    produces = ["24_merge_record__{job}__v{v}.json", "24_release_notes__{job}__v{v}.md"]
    accepts = ["*/*"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        gate_cfg = ctx.cfg.gates["24"]
        self.required_roles = gate_cfg.required_roles
        dash = build_plugin(ctx.cfg, "dashboard", ctx)
        pr = ctx.recall("PullRequestV1") or {}

        security = ctx.recall("SecurityScanV1") or {}
        # Step 18 already excludes what was waived, so this normally subtracts
        # nothing. It matters when a waiver is signed after step 18 last ran:
        # the gate should reach the same verdict whenever the decision landed,
        # rather than blocking on a finding somebody has already accepted and
        # leaving no visible reason why.
        waived = waived_refs(ctx.journal)
        open_findings = [
            f
            for f in security.get("blocking_findings", [])
            if finding_ref(f.get("scanner", ""), f) not in waived
        ]
        if gate_cfg.block_if_open_findings and open_findings:
            record = {
                "gate": "PR", "status": "BLOCKED", "approver_id": "", "approver_role": "",
                "decided_at": None,
                "comment": f"{len(open_findings)} blocking security findings are unresolved",
            }
            ctx.journal.append_approval(self.step, record)
            return env.reply(self.ref(), [structured("ApprovalRecordV1", record)],
                             intent=Intent.ERROR, status="BLOCKED")

        artifacts = ctx.artifacts.of_step(22)
        dash.open_gate(ctx, self.step, artifacts, gate_cfg)
        ctx.journal.append_event("gate_opened", step=self.step, gate=gate_cfg.name, pr=pr.get("url"))

        decision = dash.decision_or_none(ctx, self.step, gate_cfg)
        if decision is None:
            # The ticket is open and the state is on disk; the run stops rather
            # than holding a process open for a fortnight. See step 06.
            return env.reply(self.ref(), [], intent=Intent.GATE_WAIT, status="PENDING")
        record = {
            "gate": "PR", "status": decision["status"],
            "approver_id": decision.get("approver_id", ""),
            "approver_role": decision.get("approver_role", ""),
            "decided_at": decision.get("decided_at"),
            "comment": decision.get("comment", ""),
            "artifact_sha256": ctx.artifacts.sha_of(artifacts[0]) if artifacts else None,
        }
        ctx.journal.append_approval(self.step, record)

        if record["status"] != "APPROVED":
            # Align with config remediation_edges: gate 24 uses CHANGES_REQUESTED
            # (dashboard may still send REJECTED). Gate 06 keeps REJECTED for revision.
            status = record["status"]
            if status == "REJECTED":
                status = "CHANGES_REQUESTED"
                record["status"] = status
            ctx.artifacts.write(self.step, "merge_record", record, ext="json")
            return env.reply(
                self.ref(),
                [structured("ApprovalRecordV1", record)],
                intent=Intent.ERROR,
                status=status,
            )

        vcs = build_plugin(ctx.cfg, "vcs", ctx)
        merge = vcs.merge(pr.get("number", 0))
        record["merge"] = merge

        notes = self._release_notes(ctx)
        ctx.artifacts.write(self.step, "release_notes", notes, ext="md",
                            output_class="specification")
        ctx.artifacts.write(self.step, "merge_record", record, ext="json")
        return env.reply(self.ref(), [structured("ApprovalRecordV1", record)], status="APPROVED")

    def _release_notes(self, ctx: Any) -> str:
        brd = ctx.recall("BrdV1") or {}
        tdd = ctx.recall("TechnicalDesignV1") or {}
        docs = ctx.recall("DocUpdateV1") or {}
        lines = [f"# Release notes - {ctx.jira_id}", "", f"## {brd.get('title', '')}", ""]
        lines += ["### Feature", brd.get("background", "") or "-", ""]
        lines += ["### Behaviour changes"] + [f"- {d}" for d in tdd.get("decisions", [])] or ["- none"]
        lines += ["", "### Migration / configuration"] + (
            [f"- {c}" for c in tdd.get("db_changes", [])] or ["- none"]
        )
        lines += ["", "### Documentation"] + ([f"- {c}" for c in docs.get("changed", [])] or ["- none"])
        return "\n".join(lines) + "\n"


STEP = HumanReviewMergeRelease()
