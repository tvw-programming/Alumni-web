"""Step 07 - Test Case / Unit-Test Design.

Component: AGENT                Category: Test Design (pre-implementation)

Deliberately BEFORE any code exists, and deliberately AFTER the BRD is approved.
Tests designed from approved requirements describe intended behaviour; tests
written after the code describe whatever the code happens to do. Only the first
kind can catch a wrong implementation.

Every design entry carries `covers: [AC-ids]`. Step 15 reconciles these designs
with real test code, and step 13 uses the same ids to check requirement coverage.
"""

from __future__ import annotations

from typing import Any

from ._base import JsonAgentStep


class TestCaseDesign(JsonAgentStep):
    step = 7
    name = "test_case_design"
    category = "Test Design (pre-implementation)"
    capability = "reasoning"
    consumes = ["BrdV1", "StoryAnalysisV1"]
    emits = "TestDesignV1"
    slug = "test_design"
    produces = ["07_test_design__{job}__v{v}.json"]
    accepts = ["application/json"]

    def status_for(self, payload: dict, ctx: Any) -> str:
        brd = ctx.recall("BrdV1") or {}
        ac_ids = {a["id"] for a in brd.get("acceptance_criteria", [])}
        covered = {c for t in payload.get("unit", []) + payload.get("acceptance", [])
                   for c in t.get("covers", [])}
        # Every acceptance criterion needs at least one designed test, or the
        # gap surfaces at step 16 as a passing suite that proves nothing.
        missing = ac_ids - covered
        if not missing:
            return "OK"

        # The reason goes in the journal, not into the status. A status is the
        # key remediation edges are declared on, so it has to stay a token an
        # edge can name — "FAILED: no test covers AC-1" would match nothing, and
        # would do so silently. `step_error` is the event the dashboard already
        # renders as a step's error, which is where a reader is looking.
        ctx.journal.append_event("step_error", step=self.step, error=self._why(missing, covered - ac_ids))
        return "FAILED"

    @staticmethod
    def _why(missing: set[str], stray: set[str]) -> str:
        """Which criteria went uncovered, and the usual reason they did.

        A bare failure sends a reader to the artifact to work out which of four
        criteria was missed. The commonest cause is worth naming too: a coverage
        map built pointing the wrong way — `covers` holding the ids of the tests
        that cover a criterion, rather than the criteria a test verifies —
        leaves every criterion uncovered, and is invisible until you notice the
        ids are the wrong kind.
        """
        reason = f"No designed test covers {', '.join(sorted(missing))}."
        if stray:
            reason += (
                f" Every covers[] holds test ids ({', '.join(sorted(stray)[:3])}…) rather than "
                "BRD acceptance-criterion ids — the coverage map points the wrong way: "
                "covers lists the criteria a test verifies, not the tests that cover a criterion."
            )
        return reason


STEP = TestCaseDesign()
