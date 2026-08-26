"""Step 10 - Generate Feature Specification.

Component: AGENT                Category: Technical Specification

The technical contract for this ticket only. Where step 04 said "we use FastAPI
with one router per resource", this says "POST /api/v1/users/{id}/export returns
202 with a job id, 403 when id != subject".

`implementation_boundaries` is the field that earns its keep: it states in
writing what the change must NOT touch, and it is handed verbatim to the code
agent at step 12.
"""

from __future__ import annotations

from typing import Any

from ..schemas.spec import FeatureSpecV1
from ._base import JsonAgentStep, md_section


class FeatureSpecification(JsonAgentStep):
    step = 10
    name = "feature_specification"
    category = "Technical Specification"
    capability = "reasoning"
    consumes = ["BrdV1", "ProjectContextV1", "RepoUnderstandingV1", "ImpactManifestV1"]
    emits = "FeatureSpecV1"
    slug = "feature_spec"
    ext = "md"
    produces = ["10_feature_spec__{job}__v{v}.md"]
    accepts = ["application/json"]

    def post_process(self, payload: dict, ctx: Any) -> dict:
        manifest = ctx.recall("ImpactManifestV1") or {}
        if not payload.get("implementation_boundaries"):
            payload["implementation_boundaries"] = [
                f"Only these paths may be touched: {manifest.get('allowed_paths')}",
                f"Total changed lines must stay under {manifest.get('loc_budget')}",
                "No refactoring unrelated to the acceptance criteria",
            ]
        return payload

    def render_markdown(self, payload: dict) -> str:
        spec = FeatureSpecV1.model_validate(payload)
        apis = [f"`{c.method} {c.path}` -> {c.returns}" for c in spec.api_contracts]
        return (
            f"# Feature Specification\n\n{spec.summary}\n\n"
            + md_section("API Contracts", apis)
            + md_section("Data Model", spec.data_model)
            + md_section("Validation", spec.validation)
            + md_section("Errors", [f"{e.get('code')}: {e.get('when')}" for e in spec.errors])
            + md_section("UI States", spec.ui_states)
            + md_section("Accessibility", spec.accessibility)
            + md_section("Security", spec.security)
            + md_section("Acceptance Criteria", spec.acceptance_criteria)
            + md_section("Implementation Boundaries", spec.implementation_boundaries)
        )


STEP = FeatureSpecification()
