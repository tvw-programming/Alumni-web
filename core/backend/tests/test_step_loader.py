"""Numeric-prefix discovery and the contract every step file must satisfy."""

import pytest

from codegen_core.core.component import Kind
from codegen_core.core.errors import ConfigError
from codegen_core.steps._loader import load_steps


def test_all_24_steps_load(cfg):
    registry = load_steps(cfg)
    assert sorted(registry) == list(range(1, 25))


def test_step_numbers_match_filenames(cfg):
    for num, step in load_steps(cfg).items():
        assert step.step == num


def test_component_kinds_match_config(cfg):
    registry = load_steps(cfg)
    assert registry[6].kind is Kind.GATE
    assert registry[24].kind is Kind.GATE
    assert registry[14].kind is Kind.TOOL
    assert registry[1].kind is Kind.PLUGIN
    assert registry[2].kind is Kind.AGENT


def test_gates_survive_a_config_that_disables_other_steps(cfg, raw_config, tmp_path):
    import json
    from codegen_core.core.config import ConfigLoader

    raw_config["profiles"]["local"].setdefault("steps", {})["17"] = {"enabled": False}
    p = tmp_path / "c.json"
    p.write_text(json.dumps(raw_config))
    c = ConfigLoader.load(p, profile="local")
    c.app.paths.__dict__.update(cfg.app.paths.__dict__)
    registry = load_steps(c)
    assert 17 not in registry
    assert 6 in registry and 24 in registry


def test_every_step_declares_a_category(cfg):
    for step in load_steps(cfg).values():
        assert step.category, f"step {step.step} has no functional category"
