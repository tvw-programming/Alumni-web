"""MCP protocol adapter.

Deliberately thin. Every safety decision lives in `tools.py` and `tokens.py`,
which are plain callables; this file turns them into MCP tools and nothing more.
Two reasons: the logic stays testable without speaking MCP, and a second
transport later cannot end up with a different policy than this one.

Transport is Streamable HTTP bound to loopback by default. `stdio` is available
for local development only — it inherits the parent's environment and offers no
place to put an authorization header, which is fine on a laptop and not fine
anywhere else.
"""

from __future__ import annotations

import os
from typing import Any

from ..core.config import ConfigLoader
from ..core.telemetry import log
from ..core.tracing import Tracing
from .tokens import TokenError, verify
from .mutations import FileWrite, apply_patch
from .tools import (
    READ_ONLY_TOOLS,
    GatewayDenied,
    get_status,
    get_step_artifacts,
    read_file,
)


def build_server(cfg: Any | None = None) -> Any:
    """Construct the MCP server. Raises if the SDK is absent."""
    try:
        from mcp.server.mcpserver import MCPServer
    except ImportError as exc:  # pragma: no cover - dependency guard
        raise RuntimeError(
            "the MCP gateway needs the mcp package: pip install 'codegen_core[gateway]'"
        ) from exc

    cfg = cfg or ConfigLoader.load()
    tracing = Tracing(cfg)
    server = MCPServer("codegen-gateway")

    def _claims(token: str):
        """Verify, and record the refusal if it fails.

        A rejected call is audited as loudly as an accepted one — the calls that
        never ran are the interesting ones after an incident.
        """
        try:
            return verify(token)
        except TokenError as exc:
            log.warning("gateway rejected a call", extra={"extra_fields": {"reason": str(exc)}})
            raise

    @server.tool(name="repo.read_file", description="Read one file from the run's project root.")
    async def repo_read_file(workflow_token: str, path: str) -> dict[str, Any]:
        claims = _claims(workflow_token)
        with tracing.span("mcp.tool.repo.read_file") as span:
            span.set_attribute("codegen.run.id", claims.run_id)
            span.set_attribute("codegen.step.number", claims.step)
            span.set_attribute("mcp.tool.name", "repo.read_file")
            result = read_file(cfg, claims, path)
            span.set_attribute("codegen.read.bytes", result.bytes_read)
            return {
                "path": result.path,
                "content": result.content,
                "bytes": result.bytes_read,
                "truncated": result.truncated,
            }

    @server.tool(name="repo.get_status", description="List readable files in the run's project.")
    async def repo_get_status(workflow_token: str, limit: int = 500) -> dict[str, Any]:
        claims = _claims(workflow_token)
        with tracing.span("mcp.tool.repo.get_status") as span:
            span.set_attribute("codegen.run.id", claims.run_id)
            span.set_attribute("mcp.tool.name", "repo.get_status")
            return get_status(cfg, claims, limit=limit)

    @server.tool(
        name="project.get_step_artifacts",
        description="List artifacts a step of this run produced.",
    )
    async def project_get_step_artifacts(workflow_token: str, step: int) -> dict[str, Any]:
        claims = _claims(workflow_token)
        with tracing.span("mcp.tool.project.get_step_artifacts") as span:
            span.set_attribute("codegen.run.id", claims.run_id)
            span.set_attribute("mcp.tool.name", "project.get_step_artifacts")
            return get_step_artifacts(cfg, claims, step)

    # Registered only outside `direct` mode. In `direct` the pipeline writes
    # in-process and exposing a second writer would create exactly the two
    # sources of truth ADR 0004 warns about.
    if cfg.gateway.mode in ("shadow", "mcp"):

        @server.tool(
            name="repo.apply_patch",
            description="Write a declared set of files inside the run's project root.",
        )
        async def repo_apply_patch(
            workflow_token: str,
            files: list[dict[str, str]],
            expected_files: list[str],
            allowed_globs: list[str],
            loc_budget: int,
            idempotency_key: str,
            justification: str,
        ) -> dict[str, Any]:
            claims = _claims(workflow_token)
            with tracing.span("mcp.tool.repo.apply_patch") as span:
                span.set_attribute("codegen.run.id", claims.run_id)
                span.set_attribute("codegen.step.number", claims.step)
                span.set_attribute("mcp.tool.name", "repo.apply_patch")
                span.set_attribute("codegen.action.file_count", len(files))

                result = apply_patch(
                    cfg,
                    claims,
                    writes=[FileWrite(path=f["path"], content=f["content"]) for f in files],
                    expected_files=expected_files,
                    allowed_globs=allowed_globs,
                    loc_budget=loc_budget,
                    idempotency_key=idempotency_key,
                    justification=justification,
                    # Shadow validates and audits without writing, so the two
                    # paths can be compared before either is trusted alone.
                    dry_run=cfg.gateway.mode == "shadow",
                )
                span.set_attribute("codegen.mutation.status", result.status)
                return {
                    "status": result.status,
                    "changed_files": result.changed_files,
                    "changed_loc": result.changed_loc,
                    "idempotency_key": result.idempotency_key,
                    "guardrails": result.guardrails,
                }

    exposed = list(READ_ONLY_TOOLS) + (
        ["repo.apply_patch"] if cfg.gateway.mode in ("shadow", "mcp") else []
    )
    log.info(
        "gateway tools registered",
        extra={"extra_fields": {"tools": exposed, "mode": cfg.gateway.mode}},
    )
    return server


def main() -> None:
    """Entry point. Read-only tools only — see ADR 0004 for the rollout order."""
    import asyncio

    cfg = ConfigLoader.load()
    server = build_server(cfg)

    transport = os.getenv("CODEGEN_GATEWAY_TRANSPORT", "http")
    if transport == "stdio":
        log.warning("gateway on stdio: development only, no authorization boundary")
        asyncio.run(server.run_stdio_async())
        return

    # Loopback by default. Binding 0.0.0.0 is a deliberate act, not a default.
    host = os.getenv("CODEGEN_GATEWAY_HOST", "127.0.0.1")
    port = int(os.getenv("CODEGEN_GATEWAY_PORT", "8081"))
    log.info("gateway listening", extra={"extra_fields": {"host": host, "port": port}})
    server.settings.host = host
    server.settings.port = port
    asyncio.run(server.run_streamable_http_async())


__all__ = ["build_server", "main", "GatewayDenied"]
