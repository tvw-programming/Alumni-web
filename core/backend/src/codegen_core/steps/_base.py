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
from ..core.tasks import TaskTracker
from ..schemas import REGISTRY

SCHEMA_INSTRUCTION = """
Return ONLY a JSON object matching the {schema_id} schema. No prose, no markdown
fences, no explanation. If a field is unknown, use an empty list or empty string -
never invent content that is not supported by the inputs you were given.
""".strip()


def _json_type(prop: dict[str, Any], defs: dict[str, Any], depth: int = 0) -> str:
    """The JSON type a field wants, phrased the way a prompt can state it.

    A nested model is described by its keys *and their types*: the one place
    that detail is load-bearing is AmbiguityReportV1.questions_for_human, whose
    `blocks_step` decides whether the run halts for a human.

    Naming the keys without their types is what this used to do, and it left the
    model to guess both of them. It guessed the way anyone would — `id: 1`,
    because questions number from one, and `blocks_step: "backend"`, because the
    name reads as "what does this block" and `backend` is a key of the analysis
    the step was handed. Both are rejected by strict validation, and the step
    dies on output it was never told how to shape.

    `depth` stops a self-referential schema from recursing forever; one level of
    nesting is also as much as a prompt line can carry legibly.
    """
    if "$ref" in prop:
        nested = defs.get(prop["$ref"].rsplit("/", 1)[-1], {})
        props = nested.get("properties", {})
        if not props:
            return "object"
        if depth >= 1:
            return f"object with keys: {', '.join(props)}"
        required = set(nested.get("required", []))
        # Everything about one key stays inside that key's brackets. Trailing
        # the optional marker outside them reads as another key entirely, which
        # is the opposite of what a spec this fussy is for.
        keys = ", ".join(
            f"{name} ({_describe_field(spec, defs, depth + 1)}"
            + ("" if name in required else "; optional")
            + ")"
            for name, spec in props.items()
        )
        return f"object with keys: {keys}"
    if "anyOf" in prop:
        options = [o for o in prop["anyOf"] if o.get("type") != "null"]
        nullable = len(options) != len(prop["anyOf"])
        named = [_json_type(o, defs, depth) for o in options]
        if not named:
            return "any"
        # "number or null" rather than "number": a field that may be omitted is
        # one the model is otherwise tempted to fill with something wrong.
        return f"{named[0]} or null" if nullable else named[0]
    kind = prop.get("type")
    if kind == "array":
        return f"array of {_json_type(prop.get('items', {}), defs, depth)}"
    if kind == "object":
        values = prop.get("additionalProperties")
        return (
            f"object of {_json_type(values, defs, depth)}"
            if isinstance(values, dict)
            else "object"
        )
    return {"integer": "number", "boolean": "true or false"}.get(kind, kind or "any")


def _describe_field(prop: dict[str, Any], defs: dict[str, Any], depth: int = 0) -> str:
    """A field's type, plus whatever the schema says it means.

    A type alone fixes the shape but not the sense: told only that `blocks_step`
    is a number, a model still has to guess which numbering. The description is
    where the schema already answers that, so it goes in the prompt rather than
    staying in the source for people to read.
    """
    kind = _json_type(prop, defs, depth)
    note = " ".join(str(prop.get("description", "")).split())
    return f"{kind} — {note}" if note else kind


def field_spec(schema_id: str) -> str:
    """The fields of a schema, one per line, as types a model can honour.

    Naming the schema is enough for the mock backend, which keys off the name
    alone. A real model has to be told the shape: asked for ProjectContextV1
    without it, a local model returns `"architecture": []` where the schema
    wants a string, and strict validation rejects the step.
    """
    model_cls = REGISTRY.get(schema_id)
    if model_cls is None:
        return ""
    schema = model_cls.model_json_schema()
    defs = schema.get("$defs", {})
    required = set(schema.get("required", []))
    lines = [
        f"- {name}: {_describe_field(prop, defs)}"
        + (" (required)" if name in required else "")
        for name, prop in schema.get("properties", {}).items()
    ]
    return f"### {schema_id} fields\n" + "\n".join(lines) if lines else ""


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
        spec = field_spec(self.emits)
        if spec:
            blocks.append(spec)
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

        # The four things every agent step does. Declared before any of them
        # runs, so the monitor can draw the whole checklist rather than growing
        # it a row at a time.
        tracker = TaskTracker(ctx.journal, self.step)
        gather, generate, validate, persist = tracker.declare(
            [
                f"Gather inputs ({', '.join(self.consumes) or 'none'})",
                f"Generate {self.emits} with the routed model",
                f"Validate against {self.emits}",
                f"Write artifact {self.slug}",
            ]
        )

        with tracker.run(gather):
            system = ctx.prompts.load(step_cfg.prompt)
            user = self.build_user_prompt(env, ctx)

        with tracker.run(generate) as task:
            completion, backend = ctx.router.complete(self.step, system, user)
            task.detail = f"{backend.model_id}"

        with tracker.run(validate) as task:
            payload = completion.as_json()
            model_cls = REGISTRY.get(self.emits)
            if model_cls is not None and ctx.cfg.a2a.strict_schema_validation:
                payload = model_cls.model_validate(payload).model_dump(mode="json")
            else:
                task.detail = "strict_schema_validation off"
            payload = self.post_process(payload, ctx)
            ctx.remember(self.emits, payload)

        with tracker.run(persist) as task:
            if self.ext == "json":
                uri = ctx.artifacts.write(self.step, self.slug, payload, ext="json")
            else:
                uri = ctx.artifacts.write(
                    self.step, self.slug, self.render_markdown(payload), ext="md",
                    output_class="specification",
                )
            task.detail = uri.rsplit("/", 1)[-1] if isinstance(uri, str) else None

        prov = ctx.provenance_for(self.step, prompt=system + user, usage=completion.usage)
        prov = prov.model_copy(update={"backend_id": backend.id, "model_id": backend.model_id})
        status = self.status_for(payload, ctx)
        from ..core.envelope import failure_class_for

        fclass = None
        if status not in ("OK", "APPROVED", "PASSED"):
            fclass = failure_class_for(self.step)
        return env.reply(
            self.ref(),
            [structured(self.emits, payload)],
            status=status,
            provenance=prov,
            failure_class=fclass,
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
