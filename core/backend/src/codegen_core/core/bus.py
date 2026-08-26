"""A2A message bus.

Builds request envelopes for a component, adapts payloads to what that component
accepts, and provides the helpers steps use to reply. In-process today; the same
interface fronts an HTTP transport when components are split across services.
"""

from __future__ import annotations

from typing import Any

from .component import Component
from .envelope import Envelope, Intent
from .negotiate import adapt
from .parts import Part, structured


class MessageBus:
    def __init__(self, cfg: Any) -> None:
        self.cfg = cfg
        self.transport = cfg.a2a.transport

    # ------------------------------------------------------------------ #
    def build_request(self, step: Component, ctx: Any, extra_parts: list[Part] | None = None) -> Envelope:
        """Assemble the payload a step declared it consumes, adapted to what it accepts."""
        parts: list[Part] = []
        for schema_id in step.consumes:
            data = ctx.recall(schema_id)
            if data is not None:
                parts.append(structured(schema_id, data))
        parts.extend(extra_parts or [])
        parts = adapt(parts, step.accepts, ctx)

        return Envelope(
            correlation_id=ctx.job_id,
            sender=ctx.orchestrator_ref(),
            recipient=step.ref(),
            intent=Intent.REQUEST,
            accepts=step.accepts,
            parts=parts,
        )

    # ------------------------------------------------------------------ #
    def result(self, step: Component, env_in: Envelope, parts: list[Part], **kw: Any) -> Envelope:
        return env_in.reply(step.ref(), parts, intent=Intent.RESULT, **kw)

    def failure(self, step: Component, env_in: Envelope, status: str, parts: list[Part] | None = None) -> Envelope:
        return env_in.reply(step.ref(), parts or [], intent=Intent.ERROR, status=status)

    def gate_wait(self, step: Component, env_in: Envelope, parts: list[Part]) -> Envelope:
        return env_in.reply(step.ref(), parts, intent=Intent.GATE_WAIT, status="PENDING")
