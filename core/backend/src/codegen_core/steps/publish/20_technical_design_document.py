"""Step 20 - Technical Design Document.

Component: AGENT (+ doc_render) Category: As-Built Design Documentation

Written from the VERIFIED IMPLEMENTATION, not from the proposal. This ordering
is the difference between a TDD that documents what shipped and one that
documents what someone hoped would ship. It runs after tests and security
precisely so it can describe the code that actually passed them.

Inputs deliberately include the test and security reports: a design document
that omits the security posture of the thing it designs is incomplete.
"""

from __future__ import annotations

from typing import Any

from ..core.envelope import Envelope
from ._base import JsonAgentStep, md_section


class TechnicalDesignDocument(JsonAgentStep):
    step = 20
    name = "technical_design_document"
    category = "As-Built Design Documentation"
    capability = "reasoning"
    consumes = [
        "FeatureSpecV1", "CodeChangesetV1", "RequirementCoverageV1",
        "TestReportV1", "SecurityScanV1",
    ]
    emits = "TechnicalDesignV1"
    slug = "tdd"
    ext = "md"
    produces = ["20_tdd__{job}__v{v}.md", "20_tdd__{job}__v{v}.pdf"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        out = super().handle(env, ctx)
        markdown = self.render_markdown(out.json_part("TechnicalDesignV1"))
        formats = ctx.cfg.step_cfg(self.step).render_documents
        for fmt in formats:
            from ..tools.doc_render import render
            ctx.artifacts.write(self.step, "tdd", render(markdown, fmt), ext=fmt,
                                output_class="document")
        return out

    def render_markdown(self, payload: dict) -> str:
        return (
            "# Technical Design Document (as built)\n\n"
            + md_section("Architecture", payload.get("architecture", ""))
            + md_section("Sequence / Data Flow", payload.get("sequence", []))
            + md_section("APIs", payload.get("apis", []))
            + md_section("Database Changes", payload.get("db_changes", []))
            + md_section("Impacted Files", payload.get("impacted_files", []))
            + md_section("Decisions", payload.get("decisions", []))
            + md_section("Tests", payload.get("tests", []))
            + md_section("Security Considerations", payload.get("security_considerations", []))
        )


STEP = TechnicalDesignDocument()
