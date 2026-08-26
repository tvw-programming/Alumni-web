"""Step 23 - AI Pull Request Review.

Component: AGENT (isolated model)       Category: Independent Review

An independent reviewer, and independence is enforced mechanically rather than
by convention. config.routing.isolation lists this step as a reviewer of steps
12 and 15; LLMRouter checks the journal for which model actually executed those
steps and walks the fallback chain if it would otherwise pick the same one.

A model reviewing its own output agrees with itself. That is not a review.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.envelope import Envelope
from ._base import JsonAgentStep


class AiPullRequestReview(JsonAgentStep):
    step = 23
    name = "ai_pull_request_review"
    category = "Independent Review"
    capability = "reasoning"
    consumes = [
        "BrdV1", "FeatureSpecV1", "CodeChangesetV1", "RequirementCoverageV1",
        "TestReportV1", "SecurityScanV1", "TechnicalDesignV1",
    ]
    emits = "AiReviewV1"
    slug = "ai_review"
    produces = ["23_ai_review__{job}__v{v}.json"]
    accepts = ["application/json", "text/x-diff"]

    def build_user_prompt(self, env: Envelope, ctx: Any) -> str:
        diffs = [a for a in ctx.artifacts.index() if a["ext"] == "diff"]
        diff_text = ""
        if diffs:
            uri = f"artifact://{ctx.job_id}/{diffs[-1]['file']}"
            diff_text = f"## Unified diff\n```diff\n{ctx.artifacts.read_text(uri)[:20000]}\n```\n\n"
        return diff_text + super().build_user_prompt(env, ctx)

    def post_process(self, payload: dict, ctx: Any) -> dict:
        backend = ctx.router.backend_for(self.step)
        payload["reviewer_model_id"] = backend.model_id
        generator = ctx.journal.model_used(12)
        if generator and generator == backend.model_id:
            # Should be impossible - the router enforces isolation - but a review
            # that silently self-approved would be worse than a loud failure.
            payload["verdict"] = "CHANGES_REQUESTED"
            payload.setdefault("architecture", []).append(
                "reviewer isolation violated: the reviewing model also wrote the code"
            )
        if payload.get("bugs") or payload.get("security"):
            payload["verdict"] = "CHANGES_REQUESTED"
        return payload

    def status_for(self, payload: dict, ctx: Any) -> str:
        return "OK" if payload.get("verdict") == "APPROVED" else "CHANGES_REQUESTED"


STEP = AiPullRequestReview()
