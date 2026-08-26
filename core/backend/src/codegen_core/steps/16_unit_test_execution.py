"""Step 16 - Unit Test Execution.

Component: PLUGIN (pytest)      Category: Test Execution

Runs the suite and enforces the coverage floors from config. Two numbers matter
and they are different:

  line_pct          coverage of the whole repo - drifts slowly, easy to game
  changed_line_pct  coverage of files THIS ticket touched - the real signal

A failure routes back to step 12 with the tracebacks attached, up to the
max_loops budget on that remediation edge.
"""

from __future__ import annotations

from typing import Any

from ..core.component import Plugin
from ..core.envelope import Envelope
from ..core.parts import Modality, blob, structured
from ..plugins.factory import build_plugin
from ..tools.coverage_parse import changed_line_coverage
from ..tools.screenshot import capture_text_failure


class UnitTestExecution(Plugin):
    step = 16
    name = "unit_test_execution"
    category = "Test Execution"
    consumes = ["TestSyncV1", "CodeChangesetV1"]
    produces = ["16_unit_test_report__{job}__v{v}.json", "16_failure__{job}__v{v}.jpg"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        runner = build_plugin(ctx.cfg, "test_runner", ctx)
        result = runner.run(ctx.workspace)

        changeset = ctx.recall("CodeChangesetV1") or {}
        changed = changeset.get("changed_files", []) + changeset.get("created_files", [])
        coverage = result.get("coverage", {})
        coverage["changed_line_pct"] = changed_line_coverage(coverage, changed)

        thresholds = ctx.cfg.policy.quality_thresholds
        coverage_ok = (
            coverage.get("line_pct", 0) >= thresholds.min_line_coverage_pct
            and coverage["changed_line_pct"] >= thresholds.min_changed_line_coverage_pct
        )
        payload = {
            "passed": result.get("passed", 0), "failed": result.get("failed", 0),
            "skipped": result.get("skipped", 0), "duration_s": result.get("duration_s", 0.0),
            "failures": result.get("failures", []), "coverage": coverage,
            "coverage_ok": coverage_ok,
        }
        ctx.remember("TestReportV1", payload)
        ctx.artifacts.write(self.step, "unit_test_report", payload, ext="json")

        parts = [structured("TestReportV1", payload)]
        if payload["failures"]:
            text = "\n\n".join(
                f"{f.get('nodeid')}\n{f.get('message', '')[:1200]}" for f in payload["failures"][:6]
            )
            uri = ctx.artifacts.write(
                self.step, "failure", capture_text_failure(text), ext="jpg",
                output_class="error_snapshot", variant="unit",
            )
            parts.append(blob(uri, "image/jpeg", Modality.IMAGE, name="unit failures"))

        ok = payload["failed"] == 0 and coverage_ok
        return env.reply(self.ref(), parts, status="OK" if ok else "FAILED").model_copy(
            update={"parts": parts}
        )


STEP = UnitTestExecution()
