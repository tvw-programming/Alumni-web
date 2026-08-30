"""The MCP execution gateway.

Read-only in this phase, by design (ADR 0004). Mutation moves behind it in the
next one, at which point it becomes the first boundary a `cli_agent` backend
cannot step around.
"""

from ..core.errors import GatewayUnavailable
from .tokens import TokenError, WorkflowClaims, mint, verify
from .tools import GatewayDenied, READ_ONLY_TOOLS

__all__ = [
    "GatewayDenied",
    "GatewayUnavailable",
    "READ_ONLY_TOOLS",
    "TokenError",
    "WorkflowClaims",
    "mint",
    "verify",
]
