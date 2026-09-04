"""Gateway patch path for step 12 — isolated write via MCP gateway mutations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from codegen_core.core.errors import GatewayUnavailable, PolicyViolation


@dataclass
class PatchResult:
    ok: bool
    changed_files: list[str] = field(default_factory=list)
    changed_loc: int = 0
    status: str = "applied"
    detail: str = ""
    findings: list[str] = field(default_factory=list)


def run_gateway_patch(
    ctx: Any,
    *,
    writes: list[dict[str, str]] | None = None,
    findings: list[str] | None = None,
    expected_files: list[str] | None = None,
    allowed_globs: list[str] | None = None,
    loc_budget: int = 300,
    justification: str = "step 12 gateway patch",
    dry_run: bool | None = None,
) -> PatchResult:
    """Apply a declared file set through the gateway mutation layer (GuardedFS).

    Isolated from the agent / CLI paths: callers pass explicit writes + findings.
    Under `mcp` mode this is the authoritative write; under `shadow` it is dry-run.
    """
    findings = list(findings or [])
    writes = list(writes or [])
    if not writes:
        return PatchResult(ok=True, status="noop", detail="no writes", findings=findings)

    mode = ctx.cfg.gateway.mode
    if dry_run is None:
        dry_run = mode == "shadow"

    # Prove the gateway is reachable before mutating (mcp fail-closed).
    if mode == "mcp":
        _require_gateway(ctx)

    from codegen_core.gateway.mutations import FileWrite, apply_patch
    from codegen_core.gateway.tokens import WorkflowClaims
    import time

    now = int(time.time())
    claims = WorkflowClaims(
        run_id=ctx.job_id,
        step=12,
        agent="code_update",
        project_root=str(ctx.workspace),
        issued_at=now,
        expires_at=now + 900,
    )
    try:
        result = apply_patch(
            ctx.cfg,
            claims,
            writes=[FileWrite(path=w["path"], content=w["content"]) for w in writes],
            expected_files=list(expected_files or [w["path"] for w in writes]),
            allowed_globs=list(allowed_globs or ["**/*"]),
            loc_budget=loc_budget,
            idempotency_key=f"{ctx.job_id}:12:{len(writes)}",
            justification=justification,
            dry_run=bool(dry_run),
        )
    except (PolicyViolation, GatewayUnavailable) as exc:
        return PatchResult(ok=False, status="refused", detail=str(exc), findings=findings)

    return PatchResult(
        ok=True,
        changed_files=list(result.changed_files),
        changed_loc=int(result.changed_loc or 0),
        status=result.status,
        findings=findings,
    )


def _require_gateway(ctx: Any) -> None:
    from codegen_core.gateway.client import GatewayCall, GatewayClient, GatewayUnavailable as GU

    client = GatewayClient(
        ctx.cfg,
        run_id=ctx.job_id,
        step=12,
        agent="code_update",
        project_root=str(ctx.workspace),
    )
    try:
        client.call(GatewayCall(tool="repo.get_status", arguments={"limit": 1}))
    except GU as exc:
        client.guard_outage(exc)
