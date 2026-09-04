"""Unit tests for step-12 CLI path GuardedFS enforcement."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from codegen_core.core.errors import ErrDirectWriteProhibited
from codegen_core.steps.step12.cli import run_cli_audit
from codegen_core.tools.file_write_guard import GuardedFS, assert_direct_writes_allowed


class _Policy:
    def check_path(self, path, allowed):
        return None

    def check_changeset(self, files, loc):
        return None


def test_prod_profile_rejects_direct_writes():
    cfg = SimpleNamespace(active_profile="prod")
    with pytest.raises(ErrDirectWriteProhibited):
        assert_direct_writes_allowed(cfg, backend_id="devtool.cursor")


def test_local_profile_allows_direct_writes():
    cfg = SimpleNamespace(active_profile="local")
    assert_direct_writes_allowed(cfg, backend_id="devtool.cursor")  # does not raise


def test_run_cli_audit_raises_in_prod(tmp_path):
    guard = GuardedFS(tmp_path, ["**/*"], _Policy(), loc_budget=50)
    ctx = SimpleNamespace(
        cfg=SimpleNamespace(active_profile="prod"),
        workspace=tmp_path,
        policy=_Policy(),
        journal=SimpleNamespace(append_event=lambda *a, **k: None),
        job_id="J",
    )
    backend = SimpleNamespace(id="devtool.cursor", complete=MagicMock())
    with pytest.raises(ErrDirectWriteProhibited):
        run_cli_audit(
            ctx,
            backend=backend,
            system="s",
            user="u",
            guard=guard,
            manifest={"allowed_paths": ["**/*"]},
        )
    backend.complete.assert_not_called()
