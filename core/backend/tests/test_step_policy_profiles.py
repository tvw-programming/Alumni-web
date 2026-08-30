"""Per-step profiles: deny by default, and a malformed one fails at boot.

The point of validating at boot rather than at step 12 is that a typo in a
profile should stop the run before it spends tokens, not after.
"""

import json

import pytest

from codegen_core.core.config import ConfigLoader
from codegen_core.core.errors import ConfigError, PolicyViolation
from codegen_core.core.policy import PolicyEngine


def _load(raw_config, tmp_path, **step_overrides):
    for step, patch in step_overrides.items():
        raw_config["steps"][step].update(patch)
    path = tmp_path / "c.json"
    path.write_text(json.dumps(raw_config))
    return ConfigLoader.load(path, profile="local")


def test_every_step_declares_a_profile(cfg):
    """A step with no actions is read-only — safe, but it should be deliberate."""
    for step in range(1, 25):
        scfg = cfg.step_cfg(step)
        assert scfg.allowed_actions, f"step {step:02d} has no allowed_actions"
        assert scfg.risk_level


def test_only_the_sanctioned_steps_may_mutate(cfg):
    mutating = {
        step
        for step in range(1, 25)
        if {"apply_patch", "publish"} & set(cfg.step_cfg(step).allowed_actions)
    }
    # 12 and 15 write code, 21 writes docs, 22 opens the pull request.
    assert mutating == {12, 15, 21, 22}


def test_reviewers_cannot_patch(cfg):
    """13 and 23 review what 12 and 15 wrote; a reviewer that can edit is not one."""
    for step in (13, 23):
        assert "apply_patch" not in cfg.step_cfg(step).allowed_actions
        assert "apply_patch" in cfg.step_cfg(step).prohibited_tools


def test_an_unknown_action_fails_at_boot(raw_config, tmp_path):
    with pytest.raises(ConfigError, match="unknown action"):
        _load(raw_config, tmp_path, **{"12": {"allowed_actions": ["read", "rm_rf"]}})


def test_a_mutating_step_cannot_call_itself_low_risk(raw_config, tmp_path):
    with pytest.raises(ConfigError, match="risk_level"):
        _load(
            raw_config,
            tmp_path,
            **{"12": {"allowed_actions": ["read", "apply_patch"], "risk_level": "low"}},
        )


def test_deny_by_default(raw_config, tmp_path, ctx):
    """No declared actions means read-only, not unrestricted."""
    config = _load(raw_config, tmp_path, **{"02": {"allowed_actions": []}})
    policy = PolicyEngine(config, ctx.journal)

    policy.assert_action(2, "read")
    with pytest.raises(PolicyViolation, match="not permitted to apply_patch"):
        policy.assert_action(2, "apply_patch")


def test_a_granted_action_passes_and_an_ungranted_one_does_not(cfg, ctx):
    policy = PolicyEngine(cfg, ctx.journal)
    policy.assert_action(12, "apply_patch")
    with pytest.raises(PolicyViolation, match="not permitted to publish"):
        policy.assert_action(12, "publish")


def test_prohibited_tools_are_refused(cfg, ctx):
    policy = PolicyEngine(cfg, ctx.journal)
    with pytest.raises(PolicyViolation, match="prohibited from using"):
        policy.assert_tool(12, "shell.execute")
    policy.assert_tool(12, "repo.read_file")
