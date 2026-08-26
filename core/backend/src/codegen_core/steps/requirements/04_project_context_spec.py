"""Step 04 - Generate Full Project / Context Specification.

Component: AGENT (+ TOOL)       Category: Context Engineering

Project-level, not ticket-level: architecture, frameworks, folder layout, naming
conventions, reusable components. Step 10 writes the spec for THIS feature; this
step writes the rules that feature must obey.

The repo index is computed deterministically first, so the model describes a real
codebase rather than an imagined one.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.envelope import Envelope
from ..tools.repo_index import index_repo
from ._base import JsonAgentStep, md_section


class ProjectContextSpec(JsonAgentStep):
    step = 4
    name = "project_context_spec"
    category = "Context Engineering"
    capability = "reasoning"
    consumes = ["JiraStoryV1", "StoryAnalysisV1"]
    emits = "ProjectContextV1"
    slug = "project_context"
    ext = "md"
    produces = ["04_project_context__{job}__v{v}.md"]
    accepts = ["application/json"]

    def build_user_prompt(self, env: Envelope, ctx: Any) -> str:
        index = index_repo(ctx.workspace)
        base = super().build_user_prompt(env, ctx)
        return f"## RepositoryIndex\n```json\n{json.dumps(index, indent=2)}\n```\n\n{base}"

    def render_markdown(self, payload: dict) -> str:
        return (
            "# Project / Context Specification\n\n"
            + md_section("Architecture", payload.get("architecture", ""))
            + md_section("Frameworks", payload.get("frameworks", []))
            + md_section("Conventions", payload.get("conventions", []))
            + md_section("Folder Structure", payload.get("folder_structure", []))
            + md_section("Reusable Components", payload.get("reusable_components", []))
            + md_section("API Conventions", payload.get("api_conventions", []))
            + md_section("DB Conventions", payload.get("db_conventions", []))
        )


STEP = ProjectContextSpec()
