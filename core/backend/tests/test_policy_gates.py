"""Preconditions: implementation cannot start before the BRD is approved."""

import pytest

from codegen_core.core.errors import PolicyViolation


def test_post_brd_steps_require_approval(ctx):
    with pytest.raises(PolicyViolation, match="requires BRD approval"):
        ctx.policy.assert_preconditions(12, ctx)


def test_preconditions_pass_after_approval(ctx):
    ctx.journal.append_approval(6, {"gate": "BRD", "status": "APPROVED",
                                    "approver_id": "u", "approver_role": "product_owner"})
    ctx.impact_manifest = {"allowed_paths": ["app/*"]}
    ctx.policy.assert_preconditions(12, ctx)


def test_step_12_requires_an_impact_manifest(ctx):
    ctx.journal.append_approval(6, {"gate": "BRD", "status": "APPROVED",
                                    "approver_id": "u", "approver_role": "product_owner"})
    with pytest.raises(PolicyViolation, match="Impact Manifest"):
        ctx.policy.assert_preconditions(12, ctx)


def test_rejected_approval_does_not_unlock(ctx):
    ctx.journal.append_approval(6, {"gate": "BRD", "status": "REJECTED",
                                    "approver_id": "u", "approver_role": "product_owner"})
    with pytest.raises(PolicyViolation):
        ctx.policy.assert_preconditions(7, ctx)


def test_gate_role_is_enforced(cfg, ctx):
    from codegen_core.orchestrator.gates import GateService

    with pytest.raises(PermissionError, match="cannot decide"):
        GateService(cfg).decide(ctx, 6, "APPROVED", "someone", "intern")
