"""The pipeline's side of the boundary.

One rule governs this module, and it is the last acceptance criterion in the
plan: **a gateway outage pauses the run. It never falls back to the direct
path.**

A bypass that activates under failure is not a boundary — it is a boundary that
disappears exactly when something is already going wrong, which is when it is
most needed. So `GatewayUnavailable` propagates, the runner halts, and a human
decides. The alternative — quietly writing in-process because the gateway did
not answer — would mean the strictest configuration silently degrades to the
weakest one under load.

`fail_closed: false` exists for a development loop where the gateway is not
running and the operator has accepted the consequence. It is not a default and
it logs every time it is used.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from ..core.errors import GatewayUnavailable
from ..core.telemetry import log


@dataclass(frozen=True)
class GatewayCall:
    tool: str
    arguments: dict[str, Any]


class GatewayClient:
    """Talks to one gateway. Constructed per run, not per call."""

    def __init__(self, cfg: Any, run_id: str, step: int, agent: str, project_root: str) -> None:
        self.cfg = cfg
        self.run_id = run_id
        self.step = step
        self.agent = agent
        self.project_root = project_root

    # ------------------------------------------------------------------ #
    @property
    def enabled(self) -> bool:
        return self.cfg.gateway.mode in ("shadow", "mcp")

    def _token(self) -> str:
        from .tokens import mint

        return mint(self.run_id, self.step, self.agent, self.project_root)

    def call(self, call: GatewayCall) -> dict[str, Any]:
        """Invoke one tool. Raises rather than degrading.

        The MCP round trip is deliberately synchronous from the pipeline's point
        of view: the runner is a sequential loop, and an async escape here would
        buy nothing but a second concurrency model to reason about.
        """
        try:
            from mcp import ClientSession
            # Renamed in mcp 2.x; the v1 name was streamablehttp_client.
            from mcp.client.streamable_http import streamable_http_client
        except ImportError as exc:
            raise GatewayUnavailable(
                "gateway mode is enabled but the mcp package is not installed"
            ) from exc

        import asyncio

        async def _invoke() -> dict[str, Any]:
            url = self.cfg.gateway.url
            async with streamable_http_client(url) as (read, write, _):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(
                        call.tool, {**call.arguments, "workflow_token": self._token()}
                    )
                    if result.is_error:
                        # A refusal is a policy decision, not an outage. It is
                        # surfaced as-is so the run halts for the right reason.
                        from .tools import GatewayDenied

                        raise GatewayDenied(str(result.content))
                    return {"content": result.content}

        try:
            return asyncio.run(_invoke())
        except Exception as exc:
            from .tools import GatewayDenied

            if isinstance(exc, GatewayDenied):
                raise
            raise GatewayUnavailable(
                f"gateway at {self.cfg.gateway.url} did not answer: {exc}"
            ) from exc

    # ------------------------------------------------------------------ #
    def guard_outage(self, exc: GatewayUnavailable) -> None:
        """Decide what an outage means. Almost always: stop.

        Kept as one method so the decision has a single place to be read, and so
        the `fail_closed: false` path is impossible to take accidentally.
        """
        if self.cfg.gateway.fail_closed:
            log.error(
                "gateway unavailable, halting the run",
                extra={"extra_fields": {
                    "step": self.step,
                    "url": self.cfg.gateway.url,
                    "error": str(exc),
                }},
            )
            raise exc

        # Loud, every time. An operator who chose this should be reminded which
        # boundary they are running without.
        log.warning(
            "gateway unavailable and fail_closed is false — proceeding WITHOUT "
            "gateway enforcement for this step",
            extra={"extra_fields": {"step": self.step, "error": str(exc)}},
        )
