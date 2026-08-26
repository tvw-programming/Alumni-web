"""Step 03 - Requirement Gap / Ambiguity Detection.

Component: AGENT                Category: Requirement QA / Non-invention

This step exists to make the pipeline say "I don't know". Its output is a list of
things the ticket does NOT specify. The prompt forbids proposing answers - a gap
that gets quietly filled here becomes a hallucinated feature at step 12 and an
argument at step 24.

If blocking=true, the runner halts and opens a question ticket. That is
config.policy.non_invention.on_ambiguity = halt_and_ticket doing its job.
"""

from __future__ import annotations

from typing import Any

from ._base import JsonAgentStep


class GapAmbiguityDetection(JsonAgentStep):
    step = 3
    name = "gap_ambiguity_detection"
    category = "Requirement QA / Non-invention"
    capability = "reasoning"
    consumes = ["JiraStoryV1", "StoryAnalysisV1"]
    emits = "AmbiguityReportV1"
    slug = "ambiguity_report"
    produces = ["03_ambiguity_report__{job}__v{v}.json"]
    accepts = ["application/json"]

    def post_process(self, payload: dict, ctx: Any) -> dict:
        # A question that blocks a step is by definition blocking, whatever the
        # model said about the `blocking` flag.
        if any(q.get("blocks_step") for q in payload.get("questions_for_human", [])):
            payload["blocking"] = True
        return payload

    def status_for(self, payload: dict, ctx: Any) -> str:
        if payload.get("blocking") and ctx.cfg.policy.non_invention.on_ambiguity == "halt_and_ticket":
            return "AMBIGUOUS"
        return "OK"


STEP = GapAmbiguityDetection()
