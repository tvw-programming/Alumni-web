"""End-to-end run on the offline profile, plus remediation behaviour."""

import pytest

from codegen_core.core.errors import PipelineHalted
from codegen_core.orchestrator.remediation import Remediation
from codegen_core.orchestrator.runner import PipelineRunner


def test_full_pipeline_completes(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    result = PipelineRunner(cfg).run(ctx)
    assert result.ok, result.reason
    assert ctx.journal.completed(24)


def test_pipeline_halts_when_the_brd_gate_rejects(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "reject")
    result = PipelineRunner(cfg).run(ctx)
    assert not result.ok
    # Rejection routes 06 -> 05 to regenerate; it must never reach implementation.
    assert not ctx.journal.completed(12)


def test_every_step_writes_at_least_one_artifact(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    PipelineRunner(cfg).run(ctx)
    produced = {e["step"] for e in ctx.artifacts.index()}
    assert produced == set(range(1, 25))


def test_approval_is_bound_to_the_artifact_sha(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    PipelineRunner(cfg).run(ctx)
    approvals = [e for e in ctx.journal.entries() if e.get("type") == "approval"]
    assert len(approvals) == 2
    assert all(a["artifact_sha256"] for a in approvals)


# --------------------------------------------------------------------------- #
def test_remediation_edge_routes_failures(cfg, ctx):
    rem = Remediation(cfg, ctx.journal)
    # TEST-class failures go to unit-test sync (15), not straight to code (12).
    assert rem.next_step(16, "FAILED", ctx) == 15


def test_loop_budget_is_exhausted_rather_than_looping_forever(cfg, ctx):
    rem = Remediation(cfg, ctx.journal)
    # One CLASS:TEST loop, then THEN→12 once, then halt.
    assert rem.next_step(16, "FAILED", ctx) == 15
    assert rem.next_step(16, "FAILED", ctx) == 12
    with pytest.raises(PipelineHalted, match="loop budget exhausted"):
        rem.next_step(16, "FAILED", ctx)


def test_unknown_status_has_no_edge(cfg, ctx):
    rem = Remediation(cfg, ctx.journal)
    with pytest.raises(PipelineHalted, match="no remediation edge"):
        rem.next_step(16, "SOMETHING_ELSE", ctx)
