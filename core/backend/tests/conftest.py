import json
import os
import shutil
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def raw_config():
    return json.loads((ROOT / "config" / "config.json").read_text())


@pytest.fixture
def cfg(tmp_path, monkeypatch, raw_config):
    """A validated local-profile config writing into a temp directory."""
    from codegen_core.core.config import ConfigLoader

    raw_config["app"]["paths"] = {
        "artifacts": str(tmp_path / "artifacts" / "{job_id}"),
        "runs": str(tmp_path / "runs" / "{job_id}"),
        "workspace": str(tmp_path / "workspace" / "{job_id}"),
        "prompts": str(ROOT / "config" / "prompts"),
        "schema_registry": str(tmp_path / "schemas"),
    }
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw_config))
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    return ConfigLoader.load(path)


@pytest.fixture
def ctx(cfg):
    from codegen_core.core.context import JobContext

    return JobContext.create(cfg, "DEEP-1042")


def write_config(tmp_path, raw, **paths):
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw))
    return path
