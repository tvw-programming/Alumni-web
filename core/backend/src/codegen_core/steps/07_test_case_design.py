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
        return "OK" if not (ac_ids - covered) else "FAILED"


STEP = TestCaseDesign()
