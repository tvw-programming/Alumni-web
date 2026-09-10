"""Step 18 - Security & Dependency Validation.

Component: PLUGIN x3            Category: Static Security / Supply Chain

Three independent scanners, all deterministic, all vendor-swappable from config:
  sast     code-level vulnerability patterns
  sca      known CVEs in dependencies
  secrets  credentials committed by accident

Kept separate from step 19 because static and runtime analysis answer different
questions and fail for different reasons. A finding at or above the configured
blocking severity routes back to step 12 and opens remediation tickets.

A finding waived through `orchestrator.overrides` is still scanned, still
reported and still written to the artifacts — it simply stops blocking. See that
module for who may waive one and on what terms.
"""

from __future__ import annotations

from typing import Any

from ..core.component import Plugin
from ..core.envelope import Envelope
from ..core.parts import structured
from ..orchestrator.overrides import partition, waived_refs
from ..plugins.factory import build_plugin
from ..schemas.security import SastReportV1


class SecurityDependencyScan(Plugin):
    step = 18
    name = "security_dependency_scan"
    category = "Static Security & Supply Chain"
    consumes = ["CodeChangesetV1"]
    produces = [
        "18_sast__{job}__v{v}.json", "18_sca__{job}__v{v}.json", "18_secrets__{job}__v{v}.json",
        # Only when a finding has been waived; see orchestrator.overrides.
        "18_overrides__{job}__v{v}.json",
    ]
    accepts = ["application/json"]

    SCANNERS = ("sast", "sca", "secrets")

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        blocking_severities = ctx.policy.blocking_severities()
        # A waiver is a decision someone already recorded for this job; the scan
        # still finds and reports the finding, it just no longer stops the run.
        waived = waived_refs(ctx.journal)
        reports: dict[str, dict] = {}
        blocking: list[dict] = []
        excused: list[dict] = []

        for key in self.SCANNERS:
            plugin = build_plugin(ctx.cfg, key, ctx)
            raw = plugin.scan(ctx.workspace)
            report = SastReportV1.model_validate(raw)
            reports[key] = report.model_dump(mode="json")
            found = [f.model_dump(mode="json") for f in report.blocking(blocking_severities)]
            still_blocking, waived_here = partition(found, report.scanner, waived)
            blocking += still_blocking
            excused += waived_here
            ctx.artifacts.write(self.step, key, reports[key], ext="json")

        if blocking:
            tracker = build_plugin(ctx.cfg, "tracker", ctx)
            tracker.create_remediation_issues(blocking)
            ctx.journal.append_event("security_blocking", count=len(blocking))

        if excused:
            # Written as an artifact, not only journalled: someone reading the
            # run's outputs should see an accepted risk, not a clean scan.
            ctx.artifacts.write(
                self.step, "overrides", {"waived_findings": excused}, ext="json"
            )
            ctx.journal.append_event("security_waived", count=len(excused))

        payload = {
            "reports": reports,
            # What still blocks. Gate 24 reads this key, so a waived finding
            # must not appear here or the gate would refuse to open for a
            # finding somebody has already accepted.
            "blocking_findings": blocking,
            "waived_findings": excused,
        }
        ctx.remember("SecurityScanV1", payload)

        parts = [structured("SecurityScanV1", payload)]
        return env.reply(
            self.ref(), parts, status="BLOCKING_FINDINGS" if blocking else "OK"
        ).model_copy(update={"parts": parts})


STEP = SecurityDependencyScan()
