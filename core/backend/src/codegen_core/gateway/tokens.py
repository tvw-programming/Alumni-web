"""Host-signed workflow context.

The rule this module exists to enforce, from ADR 0004: **the gateway must not
trust a self-declared `agent_id`.** An agent that can name its own step and
identity can name a step whose policy is laxer than the one it is actually
running, and every authorization decision after that is made on a lie.

So workflow context does not travel in tool arguments. The host mints a signed,
short-lived token before each step and the gateway reads the claims out of it.
Arguments that duplicate a claim are ignored, not merged — see
`WorkflowClaims.conflicts_with`.

HMAC-SHA256 rather than JWT: the payload is small, the audience is one process
on a private network, and a dependency that brings its own algorithm-negotiation
surface is a poor trade for a token that never leaves the host.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass
from typing import Any

#: Long enough for one step, short enough that a captured token is stale before
#: it is useful. A step that legitimately runs longer re-mints.
DEFAULT_TTL_SECONDS = 900


class TokenError(Exception):
    """Raised for any token that is absent, malformed, expired or unsigned."""


@dataclass(frozen=True)
class WorkflowClaims:
    """What the host asserts about the caller. The gateway trusts only this."""

    run_id: str
    step: int
    agent: str
    project_root: str
    issued_at: int
    expires_at: int

    def conflicts_with(self, arguments: dict[str, Any]) -> str | None:
        """Name an argument that contradicts a claim.

        A caller passing `step=12` while holding a token for step 8 is either
        confused or probing. Either way the request is refused rather than
        silently resolved in the token's favour — a silent win teaches nothing
        and hides the probe.
        """
        for field, claimed in (("run_id", self.run_id), ("step", self.step), ("agent", self.agent)):
            supplied = arguments.get(field)
            if supplied is not None and supplied != claimed:
                return f"{field}={supplied!r} contradicts the signed claim {claimed!r}"
        return None


def _secret() -> bytes:
    key = os.getenv("CODEGEN_GATEWAY_SECRET", "")
    if not key:
        raise TokenError(
            "CODEGEN_GATEWAY_SECRET is unset; the gateway cannot verify workflow tokens"
        )
    if len(key) < 32:
        # A short key makes the signature guessable, and this is the only thing
        # standing between an agent and its own choice of step policy.
        raise TokenError("CODEGEN_GATEWAY_SECRET must be at least 32 characters")
    return key.encode()


def _b64(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def mint(
    run_id: str,
    step: int,
    agent: str,
    project_root: str,
    ttl_seconds: int = DEFAULT_TTL_SECONDS,
) -> str:
    """Issue a token for one step. Called by the host, never by an agent."""
    now = int(time.time())
    payload = {
        "run_id": run_id,
        "step": step,
        "agent": agent,
        "project_root": project_root,
        "iat": now,
        "exp": now + ttl_seconds,
    }
    body = _b64(json.dumps(payload, separators=(",", ":"), sort_keys=True).encode())
    signature = hmac.new(_secret(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(signature)}"


def verify(token: str) -> WorkflowClaims:
    """Return the claims, or raise. There is no partial success."""
    if not token:
        raise TokenError("no workflow token presented")

    try:
        body, signature = token.split(".", 1)
    except ValueError as exc:
        raise TokenError("malformed workflow token") from exc

    expected = hmac.new(_secret(), body.encode(), hashlib.sha256).digest()
    # Constant-time: a byte-by-byte comparison leaks the signature one byte at
    # a time to anything that can measure the response.
    if not hmac.compare_digest(expected, _unb64(signature)):
        raise TokenError("workflow token signature does not verify")

    try:
        payload = json.loads(_unb64(body))
    except (ValueError, json.JSONDecodeError) as exc:
        raise TokenError("workflow token payload is not readable") from exc

    now = int(time.time())
    if payload.get("exp", 0) <= now:
        raise TokenError("workflow token has expired")
    # A token from the future is a clock problem or a forgery attempt; neither
    # should be honoured.
    if payload.get("iat", 0) > now + 60:
        raise TokenError("workflow token was issued in the future")

    return WorkflowClaims(
        run_id=payload["run_id"],
        step=int(payload["step"]),
        agent=payload["agent"],
        project_root=payload["project_root"],
        issued_at=payload["iat"],
        expires_at=payload["exp"],
    )
