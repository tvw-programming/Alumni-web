"""Step 08 - Repository / Codebase Understanding.

Component: AGENT (+ repo_index TOOL)    Category: Code Comprehension

The "Our Understanding Document". The deterministic index and import graph are
computed first; the model's job is interpretation, not discovery. That ordering
matters - a model asked to list modules from memory will invent plausible ones,
while a model handed a real file listing will describe what is actually there.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.envelope import Envelope
from ..tools.repo_index import index_repo, python_dependency_graph
from ._base import JsonAgentStep, md_section


class RepoUnderstanding(JsonAgentStep):
    step = 8
    name = "repo_understanding"
    category = "Code Comprehension"
    capability = "coding"
    consumes = ["ProjectContextV1", "BrdV1"]
    emits = "RepoUnderstandingV1"
    slug = "repo_understanding"
    ext = "md"
    produces = ["08_repo_understanding__{job}__v{v}.md"]
    accepts = ["application/json"]

    def build_user_prompt(self, env: Envelope, ctx: Any) -> str:
        facts = {
            "index": index_repo(ctx.workspace),
            "imports": dict(list(python_dependency_graph(ctx.workspace).items())[:120]),
        }
        return (
            f"## GroundTruthRepositoryFacts\n```json\n{json.dumps(facts, indent=2)}\n```\n\n"
            "Describe only what these facts support.\n\n" + super().build_user_prompt(env, ctx)
        )

    def render_markdown(self, payload: dict) -> str:
        return (
            "# Our Understanding of the Codebase\n\n"
            + md_section("Modules", payload.get("modules", []))
            + md_section("Entry Points", payload.get("entry_points", []))
            + md_section("CI Jobs", payload.get("ci_jobs", []))
            + md_section("Integration Touchpoints", payload.get("integration_touchpoints", []))
            + md_section("Related Implementations", payload.get("related_implementations", []))
        )


STEP = RepoUnderstanding()
