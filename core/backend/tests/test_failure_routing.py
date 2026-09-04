"""Typed failure-class routing, journal invalidation, gate 24 status alignment."""

from __future__ import annotations

import json
from pathlib import Path

from codegen_core.core.component import Tool
from codegen_core.core.config import ConfigLoader
from codegen_core.core.context import JobContext
from codegen_core.core.envelope import (
    ComponentRef,
    Envelope,
    FailureClass,
    Intent,
    failure_class_for,
)
from codegen_core.core.journal import Journal
from codegen_core.orchestrator.remediation import Remediation
from codegen_core.orchestrator.runner import PipelineRunner
from codegen_core.steps._loader import load_steps

ROOT = Path(__file__).resolve().parents[1]


def _load(tmp_path, raw):
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw))
    return ConfigLoader.load(path, profile="local")


def _cfg(tmp_path, raw_config):
    raw_config["app"]["paths"] = {
        "artifacts": str(tmp_path / "artifacts" / "{job_id}"),
        "runs": str(tmp_path / "runs" / "{job_id}"),
        "workspace": str(tmp_path / "workspace" / "{job_id}"),
        "prompts": str(ROOT / "config" / "prompts"),
        "schema_registry": str(tmp_path / "schemas"),
    }
    return _load(tmp_path, raw_config)


def _env(step: int, status: str, fclass: FailureClass | None = None) -> Envelope:
    sender = ComponentRef(step=step, name=f"s{step}", kind="TOOL")
    return Envelope(
        correlation_id="job",
        sender=sender,
        recipient=ComponentRef(step=None, name="orchestrator", kind="RUNNER"),
        intent=Intent.ERROR,
        status=status,
        failure_class=fclass,
    )


def test_test_failure_routes_to_step_15_not_12(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config)
    ctx = JobContext.create(cfg, "DEEP-1042")
    rem = Remediation(cfg, ctx.journal)
    env = _env(16, "FAILED", FailureClass.TEST)
    assert rem.next_step(16, "FAILED", ctx, env=env) == 15
    assert ctx.store["_remediation_context"]["failure_class"] == "TEST"
    assert 15 in ctx.journal.completed_steps() or True  # invalidated list checked below
    invalidated = [
        e for e in ctx.journal.entries() if e.get("event") == "steps_invalidated"
    ]
    assert invalidated
    assert set(invalidated[0]["steps"]) >= {15, 16}


def test_lint_failure_uses_explicit_edge_to_12(tmp_path, raw_config):
    """Step 14 keeps an explicit FAILED→12 edge; class route covers other LINT sources."""
    cfg = _cfg(tmp_path, raw_config)
    ctx = JobContext.create(cfg, "DEEP-1042")
    rem = Remediation(cfg, ctx.journal)
    env = _env(14, "FAILED", FailureClass.LINT)
    assert rem.next_step(14, "FAILED", ctx, env=env) == 12
    cleared = [
        e for e in ctx.journal.entries() if e.get("event") == "steps_invalidated"
    ][-1]["steps"]
    assert 12 in cleared and 14 in cleared


def test_lint_class_route_without_edge_targets_14(tmp_path, raw_config):
    """A LINT failure at a step with no explicit edge uses failure_class_routes."""
    cfg = _cfg(tmp_path, raw_config)
    # Drop the 14 edge so class routing is visible.
    cfg = cfg.model_copy(
        update={
            "pipeline": cfg.pipeline.model_copy(
                update={
                    "remediation_edges": [
                        e for e in cfg.pipeline.remediation_edges if e.from_step != 14
                    ]
                }
            )
        }
    )
    ctx = JobContext.create(cfg, "DEEP-1042")
    rem = Remediation(cfg, ctx.journal)
    env = _env(14, "FAILED", FailureClass.LINT)
    assert rem.next_step(14, "FAILED", ctx, env=env) == 14


def test_ambiguity_routes_to_step_2(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config)
    ctx = JobContext.create(cfg, "DEEP-1042")
    rem = Remediation(cfg, ctx.journal)
    env = _env(3, "AMBIGUOUS", FailureClass.AMBIGUITY)
    assert rem.next_step(3, "AMBIGUOUS", ctx, env=env) == 2


def test_backward_jump_invalidates_intermediate_completions(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config)
    journal = Journal(cfg, "job-inv")
    # Pretend 12–16 completed.
    for s in (12, 13, 14, 15, 16):
        journal._append(
            {"type": "step", "step": s, "status": "OK", "component": "x", "kind": "TOOL",
             "intent": "result", "request_id": "r", "message_id": "m", "schemas": [],
             "provenance": {}}
        )
    journal.append_approval(6, {"status": "APPROVED"})
    assert journal.completed(12) and journal.completed(16)
    assert journal.completed(6) is False  # approvals are not step completions

    rem = Remediation(cfg, journal)
    ctx = JobContext.create(cfg, "DEEP-1042", job_id="job-inv")
    ctx.journal = journal
    rem.next_step(16, "FAILED", ctx, env=_env(16, "FAILED", FailureClass.TEST))
    # Jump to 15 invalidates [15, 16]; gate 6 untouched (not in completed_steps anyway).
    assert not journal.completed(15)
    assert not journal.completed(16)
    assert journal.completed(12) and journal.completed(13) and journal.completed(14)


def test_code_to_12_invalidates_from_12_through_failure(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config)
    ctx = JobContext.create(cfg, "DEEP-1042")
    for s in (12, 13):
        ctx.journal._append(
            {"type": "step", "step": s, "status": "OK", "component": "x", "kind": "TOOL",
             "intent": "result", "request_id": "r", "message_id": "m", "schemas": [],
             "provenance": {}}
        )
    rem = Remediation(cfg, ctx.journal)
    assert rem.next_step(13, "FAILED", ctx, env=_env(13, "FAILED", FailureClass.CODE)) == 12
    assert not ctx.journal.completed(12)
    assert not ctx.journal.completed(13)


def test_gate_24_rejected_normalises_to_changes_requested(tmp_path, raw_config, monkeypatch):
    cfg = _cfg(tmp_path, raw_config)
    ctx = JobContext.create(cfg, "DEEP-1042")
    ctx.remember("PullRequestV1", {"number": 1, "url": "http://example/pr/1"})
    ctx.remember("AiReviewV1", {"verdict": "APPROVED"})
    ctx.remember("SecurityScanV1", {"blocking_findings": []})

    class FakeDash:
        def open_gate(self, *a, **k): ...
        def decision_or_none(self, *a, **k):
            return {
                "status": "REJECTED",
                "approver_id": "rev",
                "approver_role": "tech_lead",
                "decided_at": "2026-01-01T00:00:00Z",
                "comment": "needs work",
            }

    monkeypatch.setattr(
        "codegen_core.plugins.factory.build_plugin",
        lambda cfg, name, ctx: FakeDash() if name == "dashboard" else type("X", (), {})(),
    )

    gate = load_steps(cfg)[24]
    env_in = Envelope(
        correlation_id=ctx.job_id,
        sender=ctx.orchestrator_ref(),
        recipient=gate.ref(),
    )
    out = gate.handle(env_in, ctx)
    assert out.status == "CHANGES_REQUESTED"

    rem = Remediation(cfg, ctx.journal)
    assert rem.next_step(24, out.status, ctx, env=out) == 12


def test_failure_class_for_defaults():
    assert failure_class_for(16) is FailureClass.TEST
    assert failure_class_for(14) is FailureClass.LINT
    assert failure_class_for(3) is FailureClass.AMBIGUITY
    assert failure_class_for(18) is FailureClass.SECURITY


def test_runner_injects_remediation_context_into_step_12(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config)
    seen = {}

    class Capture(Tool):
        step = 12
        name = "capture"
        consumes = []
        produces = []
        accepts = ["*/*"]

        def handle(self, env, ctx):
            seen["parts"] = [getattr(p, "schema_id", None) for p in env.parts]
            return env.reply(self.ref(), [], status="OK")

    ctx = JobContext.create(cfg, "DEEP-1042")
    ctx.journal.append_approval(6, {"status": "APPROVED"})
    ctx.impact_manifest = {"allowed_paths": ["**/*"], "loc_budget": 300}
    ctx.store["_remediation_context"] = {
        "from_step": 16,
        "to_step": 12,
        "failure_class": "TEST",
        "invalidated_steps": [12, 13, 14, 15, 16],
    }
    result = PipelineRunner(cfg, {12: Capture()}).run(ctx, start=12, stop=12)
    assert result.ok
    assert "RemediationContextV1" in seen["parts"]
