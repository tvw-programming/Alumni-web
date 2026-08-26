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


def test_phase_directories_hold_every_step(cfg):
    """Discovery is recursive, and each step sits under its dashboard phase."""
    from codegen_core.steps import _loader

    found = {
        int(p.name[:2]): p.parent.name
        for p in _loader.STEPS_DIR.rglob("[0-9][0-9]_*.py")
    }
    assert sorted(found) == list(range(1, 25))
    assert found[1] == "requirements"
    assert found[12] == "build"
    assert found[6] == found[24] == "gates"


def test_the_same_step_number_in_two_phases_is_refused(cfg, tmp_path):
    """A flat directory made this impossible; phase directories do not."""
    (tmp_path / "design").mkdir()
    (tmp_path / "build").mkdir()
    body = "from codegen_core.core.component import Component\n"
    (tmp_path / "design" / "12_code_update.py").write_text(body)
    (tmp_path / "build" / "12_code_update_again.py").write_text(body)

    with pytest.raises(ConfigError, match="defined twice"):
        load_steps(cfg, steps_dir=tmp_path)
