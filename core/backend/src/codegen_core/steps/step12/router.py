"""Step-12 dispatcher: agent / CLI-audit / gateway paths + loop-budget gate."""

from __future__ import annotations

from typing import Any

from codegen_core.core.envelope import (
    Envelope,
    FailurePayload,
    RemediationSource,
)
from codegen_core.core.errors import PolicyViolation
from codegen_core.core.guardrails import run_generated_code_guardrails
from codegen_core.core.parts import Modality, blob, structured
from codegen_core.core.telemetry import log
from codegen_core.plugins.factory import build_plugin
from codegen_core.schemas.action import ActionIntentV1, validate_intent
from codegen_core.schemas.spec import FeatureSpecV1
from codegen_core.steps.step12.agent import run_agent_fix
from codegen_core.steps.step12.cli import run_cli_audit
from codegen_core.steps.step12.failures import prior_failures_from_ctx
from codegen_core.steps.step12.gateway import run_gateway_patch
from codegen_core.tools.file_write_guard import GuardedFS


def dispatch_code_update(step_agent: Any, env: Envelope, ctx: Any) -> Envelope:
    """Route step 12 to agent, CLI-audit, or gateway — never mix the three inline."""
    manifest = ctx.require("ImpactManifestV1")
    spec = FeatureSpecV1.model_validate(ctx.require("FeatureSpecV1"))
    plan = ctx.recall("ChangePlanV1") or {}

    loop_budget = int(getattr(ctx.cfg.pipeline, "loop_budget", 3) or 3)
    loop_count = ctx.journal.code_fix_loop_count()
    prior = _resolve_prior_failures(env, ctx)

    rem_ctx = ctx.store.get("_remediation_context") or {}
    if rem_ctx.get("failure_class"):
        remediation_source: RemediationSource | str = RemediationSource.FAILURE_CLASS
    elif rem_ctx or prior:
        remediation_source = RemediationSource.FAILURE_CLASS
    else:
        remediation_source = RemediationSource.MANUAL

    # Loop budget is checked BEFORE entering the agent — no infinite remediation.
    if loop_count >= loop_budget:
        log.info(
            "code-fix loop budget exhausted",
            extra={
                "extra_fields": {
                    "workflow_id": ctx.job_id,
                    "step": 12,
                    "loop_count": loop_count,
                    "loop_budget": loop_budget,
                    "trace_id": env.trace_id,
                }
            },
        )
        ctx.journal.append_event(
            "code_fix_loop_budget_exhausted",
            step=12,
            loop_count=loop_count,
            loop_budget=loop_budget,
        )
        payload = {
            "remediation_source": RemediationSource.LOOP_BUDGET_EXHAUSTED.value,
            "failure_class": rem_ctx.get("failure_class"),
            "loop_count": loop_count,
            "loop_budget": loop_budget,
            "prior_failures": [fp.model_dump(mode="json") for fp in prior],
            "escalated_to": 24,
        }
        ctx.artifacts.write(12, "code_changeset", payload, ext="json")
        return env.reply(
            step_agent.ref(),
            [structured("CodeChangesetV1", payload)],
            status="LOOP_BUDGET_EXHAUSTED",
            remediation_source=RemediationSource.LOOP_BUDGET_EXHAUSTED,
            loop_count=loop_count,
            loop_budget=loop_budget,
            prior_failures=prior,
        )

    loop_count = ctx.journal.enter_code_fix_loop()
    env = env.model_copy(
        update={
            "remediation_source": remediation_source,
            "loop_count": loop_count,
            "loop_budget": loop_budget,
            "prior_failures": prior,
        }
    )

    guard = GuardedFS(
        root=ctx.workspace,
        allowed_globs=manifest["allowed_paths"],
        policy=ctx.policy,
        loc_budget=manifest.get("loc_budget", 300),
        author=getattr(step_agent, "name", "code_update"),
        step=12,
        trace_id=env.trace_id,
        journal=ctx.journal,
    )

    intent = validate_intent(_intent(step_agent, spec, manifest))
    ctx.remember("ActionIntentV1", intent.model_dump(mode="json"))
    ctx.journal.append_event(
        "action_intent",
        step=12,
        action=intent.action,
        justification=intent.justification,
        target_files=intent.target_files,
        risk_level=intent.risk_level,
    )

    backend = ctx.router.backend_for(12)
    system = ctx.prompts.load(ctx.cfg.step_cfg(12).prompt)
    user = _instruction(spec, plan, manifest)

    writes_own_files = getattr(backend, "edits_files_directly", False)
    gateway_mode = ctx.cfg.gateway.mode
    violations: list[str] = []
    transcript = ""
    completion: Any

    if writes_own_files and gateway_mode == "mcp":
        raise PolicyViolation(
            f"backend {backend.id!r} writes files directly, which bypasses the "
            f"MCP gateway. Set gateway.mode to 'direct' or 'shadow', or use an "
            f"in-process backend for step 12."
        )

    if gateway_mode == "mcp" and not writes_own_files:
        # Gateway owns the write; require reachability, then run agent tools that
        # ultimately land via gateway when configured — here we still use GuardedFS
        # for the in-process plan fallback, then optionally push via gateway patch.
        _require_gateway(ctx, step_agent)
        agent_result = run_agent_fix(
            ctx,
            backend=backend,
            system=system,
            user=user,
            guard=guard,
            prior_failures=prior,
        )
        completion, transcript = agent_result.completion, agent_result.transcript
        # Surface findings from prior failures into an isolated gateway call when
        # the agent produced an explicit file plan in store (optional).
        planned = ctx.store.pop("_gateway_patch_writes", None)
        if planned:
            patch = run_gateway_patch(
                ctx,
                writes=planned,
                findings=[f for fp in prior for f in fp.findings],
                expected_files=[w["path"] for w in planned],
                allowed_globs=manifest["allowed_paths"],
                loc_budget=manifest.get("loc_budget", 300),
                justification=intent.justification,
            )
            if not patch.ok:
                violations.append(patch.detail or "gateway patch refused")
    elif writes_own_files:
        cli = run_cli_audit(
            ctx,
            backend=backend,
            system=system,
            user=extend_user_for_cli(user, prior),
            guard=guard,
            manifest=manifest,
        )
        completion, transcript = cli.completion, cli.transcript
        violations = list(cli.audit.violations)
    else:
        agent_result = run_agent_fix(
            ctx,
            backend=backend,
            system=system,
            user=user,
            guard=guard,
            prior_failures=prior,
        )
        completion, transcript = agent_result.completion, agent_result.transcript

    vcs = build_plugin(ctx.cfg, "vcs", ctx)
    changeset = vcs.snapshot_changes(ctx.workspace)
    if not changeset["changed_files"] and not changeset["created_files"]:
        changeset.update(guard.summary())

    guardrails = run_generated_code_guardrails(
        _generated_sources(ctx, changeset),
        intent.model_dump(mode="json"),
        mutating=True,
        level="pipeline",
    )
    for result in guardrails:
        ctx.journal.append_event("guardrail", step=12, **result.as_event())

    diff_uri = None
    if changeset.get("unified_diff"):
        diff_uri = ctx.artifacts.write(
            12, "diff", changeset["unified_diff"], ext="diff", output_class="structured"
        )
    payload = {k: v for k, v in changeset.items() if k != "unified_diff"}
    payload["policy_violations"] = violations
    payload["transcript_excerpt"] = (transcript or "")[:2000]
    payload["action_intent"] = intent.model_dump(mode="json")
    payload["guardrails"] = [r.as_event() for r in guardrails]
    payload["remediation_source"] = (
        remediation_source.value
        if isinstance(remediation_source, RemediationSource)
        else remediation_source
    )
    payload["failure_class"] = rem_ctx.get("failure_class")
    payload["loop_count"] = loop_count
    payload["loop_budget"] = loop_budget
    payload["prior_failures"] = [fp.model_dump(mode="json") for fp in prior]

    ctx.remember("CodeChangesetV1", payload)
    ctx.artifacts.write(12, "code_changeset", payload, ext="json")

    parts = [structured("CodeChangesetV1", payload)]
    if diff_uri:
        parts.append(blob(diff_uri, "text/x-diff", Modality.DIFF, name="changeset"))

    # Prompt for provenance includes injected prior-failure text when present.
    prompt_body = system + user
    if prior:
        from codegen_core.steps.step12.failures import extend_prompt_with_failures

        prompt_body = system + extend_prompt_with_failures(user, prior)

    prov = ctx.provenance_for(12, prompt=prompt_body, usage=completion.usage)
    prov = prov.model_copy(update={"backend_id": backend.id, "model_id": backend.model_id})
    return env.reply(
        step_agent.ref(),
        parts,
        status="POLICY_VIOLATION" if violations else "OK",
        provenance=prov,
        remediation_source=remediation_source,
        loop_count=loop_count,
        loop_budget=loop_budget,
        prior_failures=prior,
    ).model_copy(update={"parts": parts})


def extend_user_for_cli(user: str, prior: list[FailurePayload]) -> str:
    from codegen_core.steps.step12.failures import extend_prompt_with_failures

    return extend_prompt_with_failures(user, prior)


def _resolve_prior_failures(env: Envelope, ctx: Any) -> list[FailurePayload]:
    if env.prior_failures:
        return list(env.prior_failures)[-3:]
    part = env.maybe_json_part("RemediationContextV1") or {}
    embedded = part.get("prior_failures") or []
    if embedded:
        return [FailurePayload.model_validate(p) for p in embedded[-3:]]
    return prior_failures_from_ctx(ctx, limit=3)


def _instruction(spec: FeatureSpecV1, plan: dict, manifest: dict) -> str:
    steps = "\n".join(
        f"{c['seq']}. [{c['layer']}] {c['action']} {c['file']}"
        for c in plan.get("ordered_changes", [])
    )
    return (
        f"{spec.as_change_instruction()}\n\n"
        f"## Ordered change plan - follow this sequence exactly\n{steps or '(none)'}\n\n"
        f"## Hard limits\n"
        f"- You may only write to: {manifest['allowed_paths']}\n"
        f"- Total changed lines must stay under {manifest.get('loc_budget')}\n"
        f"- Do not refactor anything the acceptance criteria do not require\n"
    )


def _intent(step_agent: Any, spec: Any, manifest: dict) -> ActionIntentV1:
    files = list(manifest.get("files_to_modify", [])) + list(manifest.get("files_to_create", []))
    criteria = getattr(spec, "acceptance_criteria", None) or []
    why = criteria[0] if criteria else getattr(spec, "summary", "the feature specification")
    return ActionIntentV1(
        step=12,
        agent=getattr(step_agent, "name", "code_update"),
        action="apply_patch",
        justification=(
            f"Change {', '.join(files[:4]) or 'the whitelisted paths'} to satisfy {why}. "
            f"Scope is bounded by the step-09 Impact Manifest "
            f"({len(files)} file(s), {manifest.get('loc_budget', 0)} LOC budget); "
            f"nothing outside that whitelist is writable."
        ),
        target_files=files,
        expected_outcome=(
            "The whitelisted files implement the specified change and the "
            "acceptance criteria become verifiable at step 13."
        ),
        validation_plan=[
            "step 14 static quality validation (ruff, mypy)",
            "step 16 pytest unit test execution",
            "step 18 sast and dependency scan",
        ],
        risk_level="critical",
        requires_human_approval=True,
    )


def _generated_sources(ctx: Any, changeset: dict) -> dict[str, str]:
    sources: dict[str, str] = {}
    touched = list(changeset.get("changed_files", [])) + list(changeset.get("created_files", []))
    for rel in touched:
        path = ctx.workspace / rel
        try:
            sources[rel] = path.read_text(encoding="utf-8", errors="replace")
        except (OSError, IsADirectoryError):
            continue
    return sources


def _require_gateway(ctx: Any, step_agent: Any) -> None:
    from codegen_core.gateway.client import GatewayCall, GatewayClient, GatewayUnavailable

    client = GatewayClient(
        ctx.cfg,
        run_id=ctx.job_id,
        step=12,
        agent=getattr(step_agent, "name", "code_update"),
        project_root=str(ctx.workspace),
    )
    try:
        client.call(GatewayCall(tool="repo.get_status", arguments={"limit": 1}))
    except GatewayUnavailable as exc:
        client.guard_outage(exc)
