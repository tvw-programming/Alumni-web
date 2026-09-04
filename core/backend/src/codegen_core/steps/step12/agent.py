"""In-process agent path for step 12 — all writes go through GuardedFS."""

from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any

from codegen_core.core.envelope import FailurePayload
from codegen_core.core.telemetry import log
from codegen_core.steps.step12.failures import extend_prompt_with_failures
from codegen_core.tools.file_write_guard import GuardedFS, make_guarded_fs_tools


@dataclass
class AgentFixResult:
    completion: Any
    transcript: str
    prompt: str
    prior_failures: list[FailurePayload]


def run_agent_fix(
    ctx: Any,
    *,
    backend: Any,
    system: str,
    user: str,
    guard: GuardedFS,
    prior_failures: list[FailurePayload] | None = None,
    step: int = 12,
) -> AgentFixResult:
    """Run the code-fix agent with prior failure context injected into the prompt."""
    failures = list(prior_failures or [])
    prompt = extend_prompt_with_failures(user, failures)
    log.debug(
        "prompt extended with context",
        extra={
            "extra_fields": {
                "step": str(step),
                "failures": [fp.model_dump(mode="json") for fp in failures],
                "workflow_id": getattr(ctx, "job_id", None),
                "trace_id": getattr(guard, "trace_id", None),
            }
        },
    )

    try:
        from deepagents import create_deep_agent
    except ImportError:
        completion, _ = ctx.router.complete(
            step,
            system,
            prompt + '\n\nReturn JSON: {"files": [{"path": ..., "content": ...}]}',
        )
        try:
            for f in completion.as_json().get("files", []):
                guard.write_file(f["path"], f["content"])
        except Exception as exc:  # noqa: BLE001 - surfaced as a step failure
            ctx.journal.append_event("code_update_fallback_error", error=str(exc))
        return AgentFixResult(
            completion=completion,
            transcript=completion.text,
            prompt=prompt,
            prior_failures=failures,
        )

    agent = create_deep_agent(
        model=backend.model_id,
        tools=make_guarded_fs_tools(guard),
        system_prompt=system,
    )
    result = agent.invoke({"messages": [{"role": "user", "content": prompt}]})
    text = json.dumps(result, default=str)[:4000]

    class _C:
        usage = {"tokens_in": 0, "tokens_out": 0}

    return AgentFixResult(
        completion=_C(),
        transcript=text,
        prompt=prompt,
        prior_failures=failures,
    )
