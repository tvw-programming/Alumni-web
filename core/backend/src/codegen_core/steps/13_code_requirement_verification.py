"""Step 13 - Code-to-Requirement Verification.

Component: AGENT (isolated context)     Category: Traceability Verification

Answers two questions in both directions:
  * does every acceptance criterion have code behind it?   (missing)
  * does every code change trace to an acceptance criterion? (unrelated_changes,
    hallucinated_functionality)

The second direction is the one people forget, and it is where scope creep and
invented features get caught.

A deterministic traceability matrix is built first, so the model reasons over a
small structured gap list rather than the whole diff. Routing sends this step to
a different model than step 12 via the reviewer-isolation rule.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.envelope import Envelope
from ..tools.traceability_matrix import build, uncovered
from ._base import JsonAgentStep


class CodeRequirementVerification(JsonAgentStep):
    step = 13
    name = "code_requirement_verification"
    category = "Traceability Verification"
    capability = "reasoning"
    consumes = ["BrdV1", "CodeChangesetV1", "FeatureSpecV1", "ImpactManifestV1"]
    emits = "RequirementCoverageV1"
    slug = "requirement_coverage"
    produces = ["13_requirement_coverage__{job}__v{v}.json"]
    accepts = ["application/json"]

    def build_user_prompt(self, env: Envelope, ctx: Any) -> str:
        brd = ctx.recall("BrdV1") or {}
        changeset = ctx.recall("CodeChangesetV1") or {}
        ac_ids = [a["id"] for a in brd.get("acceptance_criteria", [])]
        files = changeset.get("changed_files", []) + changeset.get("created_files", [])
        matrix = build(ac_ids, files, ctx.workspace)
        facts = {"traceability_matrix": matrix, "uncovered_criteria": uncovered(matrix),
                 "changed_files": files}
        return (
            f"## DeterministicTraceability\n```json\n{json.dumps(facts, indent=2)}\n```\n\n"
            + super().build_user_prompt(env, ctx)
        )

    def post_process(self, payload: dict, ctx: Any) -> dict:
        if payload.get("missing") or payload.get("hallucinated_functionality"):
            payload["verdict"] = "FAILED"
        return payload

    def status_for(self, payload: dict, ctx: Any) -> str:
        return "OK" if payload.get("verdict") == "PASSED" else "FAILED"


STEP = CodeRequirementVerification()
