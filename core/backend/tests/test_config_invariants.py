"""The invariants that make the two human gates real controls.

If any test here starts failing, someone has made it possible to configure the
safety properties away - which is exactly the failure mode the design exists to
prevent.
"""

import json

import pytest

from codegen_core.core.config import ConfigLoader
from codegen_core.core.errors import ConfigError


def load(tmp_path, raw, profile="local"):
    p = tmp_path / "config.json"
    p.write_text(json.dumps(raw))
    return ConfigLoader.load(p, profile=profile)


# --------------------------------------------------------------------------- #
def test_baseline_config_is_valid(cfg):
    assert cfg.active_profile == "local"
    assert set(cfg.gates) == {"06", "24"}


@pytest.mark.parametrize("gate", ["06", "24"])
def test_gate_cannot_be_disabled(tmp_path, raw_config, gate):
    raw_config["steps"][gate]["enabled"] = False
    with pytest.raises(ConfigError, match="mandatory human gate"):
        load(tmp_path, raw_config)


@pytest.mark.parametrize("gate", ["06", "24"])
def test_gate_cannot_be_downgraded_to_a_non_gate(tmp_path, raw_config, gate):
    raw_config["steps"][gate]["component"] = "tool"
    with pytest.raises(ConfigError, match="mandatory human gate"):
        load(tmp_path, raw_config)


@pytest.mark.parametrize("gate", ["06", "24"])
def test_gate_cannot_be_disabled_via_a_profile_overlay(tmp_path, raw_config, gate):
    """The overlay path is the sneaky one: base config looks fine, profile guts it."""
    raw_config["profiles"]["local"].setdefault("steps", {})[gate] = {"enabled": False}
    with pytest.raises(ConfigError, match="mandatory human gate"):
        load(tmp_path, raw_config)


@pytest.mark.parametrize("gate", ["06", "24"])
def test_gate_can_disable_flag_is_rejected(tmp_path, raw_config, gate):
    raw_config["gates"][gate]["can_disable"] = True
    with pytest.raises(ConfigError, match="can_disable"):
        load(tmp_path, raw_config)


# --------------------------------------------------------------------------- #
def test_routing_to_a_disabled_backend_is_rejected(tmp_path, raw_config):
    raw_config["profiles"]["local"]["routing"]["defaults"]["coding"] = "devtool.cursor"
    with pytest.raises(ConfigError):
        load(tmp_path, raw_config)


def test_capability_mismatch_is_rejected(tmp_path, raw_config):
    raw_config["backends"]["mock.offline"]["capabilities"] = ["fast"]
    with pytest.raises(ConfigError):
        load(tmp_path, raw_config)


def test_unsatisfiable_isolation_rule_is_rejected(tmp_path, raw_config):
    """One backend means the reviewer would be the author. Refuse to start."""
    raw_config["backends"] = {"mock.offline": raw_config["backends"]["mock.offline"]}
    raw_config["profiles"]["local"]["routing"]["fallback_chains"] = {
        c: ["mock.offline"] for c in ["fast", "coding", "reasoning", "security", "vision"]
    }
    with pytest.raises(ConfigError, match="unsatisfiable"):
        load(tmp_path, raw_config)


def test_remediation_edge_to_unknown_step_is_rejected(tmp_path, raw_config):
    raw_config["pipeline"]["remediation_edges"].append(
        {"from": 16, "on": "WEIRD", "to": 99, "max_loops": 2}
    )
    with pytest.raises(ConfigError, match="unknown step"):
        load(tmp_path, raw_config)


def test_remediation_edge_needs_a_loop_budget(tmp_path, raw_config):
    raw_config["pipeline"]["remediation_edges"][0]["max_loops"] = 0
    with pytest.raises(ConfigError, match="max_loops"):
        load(tmp_path, raw_config)


def test_literal_secret_in_config_is_rejected(tmp_path, raw_config):
    raw_config["backends"]["paid.anthropic.sonnet"]["auth"]["token_env"] = "sk-" + "a" * 40
    with pytest.raises(ConfigError, match="literal secret"):
        load(tmp_path, raw_config)


def test_unknown_profile_is_rejected(tmp_path, raw_config):
    with pytest.raises(ConfigError, match="unknown profile"):
        load(tmp_path, raw_config, profile="does-not-exist")


def test_profile_overlay_deep_merges(tmp_path, raw_config):
    cfg = load(tmp_path, raw_config, profile="local")
    # overlay replaced the routing defaults but kept the untouched sections
    assert cfg.routing.defaults["coding"] == "mock.offline"
    assert cfg.artifacts.checksum_algorithm == "sha256"
