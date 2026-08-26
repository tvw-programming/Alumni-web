"""Step 05 - Generate BRD.

Component: AGENT (+ doc_render TOOL)    Category: Business Documentation

The BRD is the artifact a human signs at gate 06. Everything downstream traces to
its acceptance criteria ids, so those ids must be stable: step 07 designs tests
against them, step 13 verifies code against them, step 23 reviews against them.

Emits .md (the reviewable source) plus the rendered .pdf that the artifact rules
require for a document-class output.
"""

from __future__ import annotations

from typing import Any

from ..core.envelope import Envelope
from ..core.parts import structured
from ..schemas.brd import BrdV1
from ._base import JsonAgentStep


class BrdGeneration(JsonAgentStep):
    step = 5
    name = "brd_generation"
    category = "Business Documentation"
    capability = "reasoning"
    consumes = ["JiraStoryV1", "StoryAnalysisV1", "AmbiguityReportV1", "ProjectContextV1"]
    emits = "BrdV1"
    slug = "brd"
    produces = ["05_brd__{job}__v{v}.md", "05_brd__{job}__v{v}.pdf"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        out = super().handle(env, ctx)
        brd = BrdV1.model_validate(out.json_part("BrdV1"))
        formats = ctx.cfg.step_cfg(self.step).render_documents
        uris = ctx.artifacts.write_document(self.step, "brd", brd.as_markdown(), formats)
        ctx.remember("BrdArtifacts", {"uris": uris})
        return out

    def status_for(self, payload: dict, ctx: Any) -> str:
        # A BRD with no acceptance criteria cannot be verified later, so it is
        # not a BRD. Fail here rather than at step 13.
        return "OK" if payload.get("acceptance_criteria") else "FAILED"


STEP = BrdGeneration()
