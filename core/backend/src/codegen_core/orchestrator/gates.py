"""Gate helpers used by the CLI and the dashboard."""

from __future__ import annotations

from typing import Any

from ..core.errors import RevisionNotAllowed
from ..plugins.factory import build_plugin
from .gate_revision import GateRevisionService


class GateService:
    def __init__(self, cfg: Any) -> None:
        self.cfg = cfg
        self.revisions = GateRevisionService(cfg)

    def pending(self, ctx: Any) -> list[dict]:
        return build_plugin(self.cfg, "dashboard", ctx).pending(ctx)

    def decide(
        self, ctx: Any, step: int, status: str, approver_id: str, role: str, comment: str = ""
    ) -> dict:
        gate_cfg = self.cfg.gates.get(f"{step:02d}")
        if gate_cfg is None:
            raise ValueError(f"step {step:02d} is not a gate")
        if gate_cfg.required_roles and role not in gate_cfg.required_roles:
            raise PermissionError(
                f"role '{role}' cannot decide gate {step:02d}; needs one of {gate_cfg.required_roles}"
            )
        # A gate that stands rejected is waiting for a replacement document, not
        # for a second opinion. Accepting a decision here would let an approval
        # land against the bytes that were just rejected.
        state = self.revisions.state(ctx, step)
        if state is not None and (state["required"] or state["exhausted"]):
            raise RevisionNotAllowed(
                f"gate {step:02d} was rejected and is waiting for a replacement document. "
                "Upload one and the gate re-opens against it; until then there is nothing "
                "new to decide."
            )
        dash = build_plugin(self.cfg, "dashboard", ctx)
        return dash.record_decision(ctx, step, status, approver_id, role, comment)

    # ------------------------------------------------------------------ #
    def revise(self, ctx: Any, step: int, **kwargs: Any) -> dict:
        """Replace the document a gate rejected. See GateRevisionService.revise."""
        return self.revisions.revise(ctx, step, **kwargs)

    def revision_state(self, ctx: Any, step: int, entries: list[dict] | None = None) -> dict | None:
        return self.revisions.state(ctx, step, entries)
