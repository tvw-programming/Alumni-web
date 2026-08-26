"""Config-driven failure routing.

Where v1 hardcoded "step 16 failure goes back to step 12", the edges now come
from config.pipeline.remediation_edges. Two consequences worth understanding:

  * the pipeline topology is inspectable data, not control flow buried in a loop
  * every edge carries max_loops, so an infinite remediation cycle is not
    something you can write by accident - the runner escalates instead
"""

from __future__ import annotations

from typing import Any

from ..core.errors import PipelineHalted
from ..core.telemetry import log


class Remediation:
    def __init__(self, cfg: Any, journal: Any, notifier: Any = None) -> None:
        self.cfg = cfg
        self.journal = journal
        self.notifier = notifier
        self.edges = {(e.from_step, e.on): e for e in cfg.pipeline.remediation_edges}

    def next_step(self, step: int, status: str, ctx: Any) -> int:
        edge = self.edges.get((step, status))
        if edge is None:
            raise PipelineHalted(step, self._no_edge_reason(step, status))

        used = self.journal.loop_count(edge)
        if used >= edge.max_loops:
            if self.notifier:
                self.notifier.escalate(ctx, edge)
            self.journal.append_event("loop_budget_exhausted", step=step, on=status,
                                      max_loops=edge.max_loops)
            raise PipelineHalted(step, f"loop budget exhausted ({edge.max_loops}) for '{status}'")

        self.journal.record_loop(edge)
        log.info(
            "remediating",
            extra={"extra_fields": {"from": step, "to": edge.to_step, "on": status,
                                    "loop": used + 1, "max": edge.max_loops}},
        )
        return edge.to_step

    def _no_edge_reason(self, step: int, status: str) -> str:
        """Why the run stops, in terms of what the reader can do about it.

        A rejected gate is the common case and the least mysterious one: the
        document was wrong, and no edge exists precisely because re-running the
        same inputs would produce the same document.
        """
        gate = self.cfg.gates.get(f"{step:02d}")
        if gate is not None and status == "REJECTED":
            if gate.revision.enabled:
                return (
                    f"{gate.name} was rejected. The run stops here until a reviewer supplies a "
                    f"replacement for the step {gate.revision.replaces_step:02d} document; "
                    "re-running the same inputs would only produce the same document."
                )
            return f"{gate.name} was rejected and this gate declares no way forward"
        return f"no remediation edge for status '{status}'"

    def describe(self) -> list[dict]:
        return [
            {"from": e.from_step, "on": e.on, "to": e.to_step, "max_loops": e.max_loops}
            for e in self.cfg.pipeline.remediation_edges
        ]
