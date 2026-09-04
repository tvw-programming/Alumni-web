"""Config-driven failure routing with typed failure classes.

Prefer an explicit (step, status) remediation edge when one exists. Otherwise
route by `FailureClass` so test/lint/ambiguity failures are not forced through
the code agent at step 12.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..core.envelope import FailureClass, failure_class_for
from ..core.errors import PipelineHalted
from ..core.telemetry import log

#: Gate 06 keeps REJECTED (revision path). Gate 24 normalises to CHANGES_REQUESTED.
_STATUS_ALIASES = {
    (24, "REJECTED"): "CHANGES_REQUESTED",
}


#: Statuses that may fall through to failure_class_routes when no explicit edge matches.
_CLASSABLE_STATUSES = frozenset(
    {"FAILED", "BLOCKING_FINDINGS", "CHANGES_REQUESTED", "AMBIGUOUS", "REJECTED"}
)


@dataclass
class _ClassEdge:
    from_step: int
    to_step: int
    on: str
    max_loops: int


class Remediation:
    def __init__(self, cfg: Any, journal: Any, notifier: Any = None) -> None:
        self.cfg = cfg
        self.journal = journal
        self.notifier = notifier
        self.edges = {(e.from_step, e.on): e for e in cfg.pipeline.remediation_edges}
        self.class_routes = {
            r.failure_class: r for r in cfg.pipeline.failure_class_routes
        }

    def next_step(
        self,
        step: int,
        status: str,
        ctx: Any,
        *,
        env: Any = None,
        failure_class: FailureClass | None = None,
        use_class_routes: bool = True,
    ) -> int:
        status = _STATUS_ALIASES.get((step, status), status)
        fclass = failure_class or failure_class_for(step, env)

        edge = self.edges.get((step, status))
        is_gate = f"{step:02d}" in self.cfg.gates
        if (
            edge is None
            and use_class_routes
            and not is_gate
            and status in _CLASSABLE_STATUSES
        ):
            edge = self._class_edge(step, fclass)

        if edge is None:
            raise PipelineHalted(step, self._no_edge_reason(step, status, fclass))

        used = (
            self.journal.class_loop_count(fclass.value)
            if isinstance(edge, _ClassEdge)
            else self.journal.loop_count(edge)
        )
        if used >= edge.max_loops:
            then = self._then_step(fclass)
            then_used = self.journal.class_then_count(fclass.value)
            if (
                then is not None
                and then != edge.to_step
                and then_used < 1
            ):
                log.info(
                    "route budget spent; falling through",
                    extra={
                        "extra_fields": {
                            "workflow_id": ctx.job_id,
                            "step": step,
                            "trace_id": getattr(env, "trace_id", None),
                            "failure_class": fclass.value,
                            "then": then,
                        }
                    },
                )
                self._invalidate(step, then, ctx, fclass, env)
                self.journal.record_loop(
                    _ClassEdge(
                        from_step=step,
                        to_step=then,
                        on=f"CLASS:{fclass.value}:THEN",
                        max_loops=1,
                    )
                )
                return then

            if self.notifier:
                self.notifier.escalate(ctx, edge)
            self.journal.append_event(
                "loop_budget_exhausted",
                step=step,
                on=edge.on,
                max_loops=edge.max_loops,
                failure_class=fclass.value,
            )
            raise PipelineHalted(step, f"loop budget exhausted ({edge.max_loops}) for '{edge.on}'")

        self.journal.record_loop(edge)
        self._invalidate(step, edge.to_step, ctx, fclass, env)
        log.info(
            "remediating",
            extra={
                "extra_fields": {
                    "workflow_id": ctx.job_id,
                    "from": step,
                    "to": edge.to_step,
                    "on": edge.on,
                    "loop": used + 1,
                    "max": edge.max_loops,
                    "failure_class": fclass.value,
                    "trace_id": getattr(env, "trace_id", None),
                }
            },
        )
        return edge.to_step

    def _class_edge(self, step: int, fclass: FailureClass) -> _ClassEdge | None:
        route = self.class_routes.get(fclass.value)
        if route is None:
            return None
        to = route.to_step
        # Never jump *forward* past the failure (e.g. step 7 TEST must not skip to 15).
        if to > step:
            to = step
        return _ClassEdge(
            from_step=step,
            to_step=to,
            on=f"CLASS:{fclass.value}",
            max_loops=route.max_loops,
        )

    def _then_step(self, fclass: FailureClass) -> int | None:
        route = self.class_routes.get(fclass.value)
        return None if route is None else route.then_step

    def _invalidate(
        self,
        from_step: int,
        to_step: int,
        ctx: Any,
        fclass: FailureClass,
        env: Any,
    ) -> None:
        """Clear stale completions between the jump target and the failure."""
        if to_step >= from_step:
            # Self-retry or forward: only clear the failed step itself.
            cleared = self.journal.invalidate_steps(
                [from_step],
                reason=f"remediate {from_step}->{to_step} ({fclass.value})",
            )
        else:
            cleared = self.journal.invalidate_steps(
                list(range(to_step, from_step + 1)),
                reason=f"remediate {from_step}->{to_step} ({fclass.value})",
            )
        # Prior failure payloads for step 12 / 14 / 15 to consume.
        payload = {
            "from_step": from_step,
            "to_step": to_step,
            "failure_class": fclass.value,
            "status": getattr(env, "status", None),
            "schemas": list(getattr(env, "schema_ids", lambda: [])()),
            "parts": [
                p.model_dump(mode="json") if hasattr(p, "model_dump") else p
                for p in (getattr(env, "parts", None) or [])
            ],
            "invalidated_steps": cleared,
        }
        ctx.store["_remediation_context"] = payload
        ctx.journal.append_event(
            "remediation_context",
            workflow_id=ctx.job_id,
            failure_class=fclass.value,
            from_step=from_step,
            to_step=to_step,
            invalidated=cleared,
            trace_id=getattr(env, "trace_id", None),
        )

    def _no_edge_reason(self, step: int, status: str, fclass: FailureClass) -> str:
        gate = self.cfg.gates.get(f"{step:02d}")
        if gate is not None and status == "REJECTED":
            if gate.revision.enabled:
                return (
                    f"{gate.name} was rejected. The run stops here until a reviewer supplies a "
                    f"replacement for the step {gate.revision.replaces_step:02d} document; "
                    "re-running the same inputs would only produce the same document."
                )
            return f"{gate.name} was rejected and this gate declares no way forward"
        return (
            f"no remediation edge for status '{status}' "
            f"(failure_class={fclass.value})"
        )

    def describe(self) -> list[dict]:
        rows = [
            {"from": e.from_step, "on": e.on, "to": e.to_step, "max_loops": e.max_loops}
            for e in self.cfg.pipeline.remediation_edges
        ]
        for r in self.cfg.pipeline.failure_class_routes:
            rows.append(
                {
                    "class": r.failure_class,
                    "to": r.to_step,
                    "then": r.then_step,
                    "max_loops": r.max_loops,
                }
            )
        return rows
