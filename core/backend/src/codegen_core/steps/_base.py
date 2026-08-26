"""Shared step machinery.

Most agent steps do the same five things:
  1. gather typed inputs from the envelope / context
  2. render a prompt that names the schema it must return
  3. call the routed model
  4. validate the response against that pydantic schema
  5. persist an artifact and reply with a JsonPart

JsonAgentStep does all of that so each concrete step file stays about 25 lines
and contains only what is genuinely specific to that stage.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.component import Agent
from ..core.envelope import Envelope
from ..core.parts import structured
from ..schemas import REGISTRY

SCHEMA_INSTRUCTION = """
Return ONLY a JSON object matching the {schema_id} schema. No prose, no markdown
fences, no explanation. If a field is unknown, use an empty list or empty string -
never invent content that is not supported by the inputs you were given.
""".strip()


class JsonAgentStep(Agent):
    """An agent whose entire output is one validated JSON artifact."""

    #: schema_id this step must emit
    emits: str = ""
    #: artifact slug, e.g. "story_analysis" -> 02_story_analysis__JOB__v1.json
    slug: str = ""
    #: "structured" (.json) or "specification" (.md)
    output_class: str = "structured"
    ext: str = "json"

    # ------------------------------------------------------------------ #
    def build_user_prompt(self, env: Envelope, ctx: Any) -> str:
        """Default: hand the model every typed input this step declared."""
        blocks = []
        for schema_id in self.consumes:
            data = env.maybe_json_part(schema_id) or ctx.recall(schema_id)
            if data is not None:
                blocks.append(f"## {schema_id}\n```json\n{json.dumps(data, indent=2)}\n```")
        blocks.append(SCHEMA_INSTRUCTION.format(schema_id=self.emits))
        return "\n\n".join(blocks)

    def post_process(self, payload: dict, ctx: Any) -> dict:
        """Hook for steps that need to enrich or check the model's output."""
        return payload

    def status_for(self, payload: dict, ctx: Any) -> str:
        """Hook for steps whose result can fail the pipeline (13, 18, 19...)."""
        return "OK"

    # ------------------------------------------------------------------ #
    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        step_cfg = ctx.cfg.step_cfg(self.step)
        system = ctx.prompts.load(step_cfg.prompt)
        user = self.build_user_prompt(env, ctx)

        completion, backend = ctx.router.complete(self.step, system, user)
        payload = completion.as_json()

        model_cls = REGISTRY.get(self.emits)
        if model_cls is not None and ctx.cfg.a2a.strict_schema_validation:
            payload = model_cls.model_validate(payload).model_dump(mode="json")

        payload = self.post_process(payload, ctx)
        ctx.remember(self.emits, payload)

        if self.ext == "json":
            uri = ctx.artifacts.write(self.step, self.slug, payload, ext="json")
        else:
            uri = ctx.artifacts.write(
                self.step, self.slug, self.render_markdown(payload), ext="md",
                output_class="specification",
            )

        prov = ctx.provenance_for(self.step, prompt=system + user, usage=completion.usage)
        prov = prov.model_copy(update={"backend_id": backend.id, "model_id": backend.model_id})
        return env.reply(
            self.ref(),
            [structured(self.emits, payload)],
            status=self.status_for(payload, ctx),
            provenance=prov,
        ).model_copy(update={"parts": [structured(self.emits, payload)]})

    def render_markdown(self, payload: dict) -> str:
        """Override in steps whose artifact is a .md specification."""
        return "```json\n" + json.dumps(payload, indent=2) + "\n```"


def md_section(title: str, items: Any) -> str:
    if isinstance(items, dict):
        body = "\n".join(f"- **{k}**: {v}" for k, v in items.items())
    elif isinstance(items, list):
        body = "\n".join(f"- {i}" for i in items)
    else:
        body = str(items)
    return f"## {title}\n\n{body or '- (none)'}\n"
