"""The write guard is the only thing between an agent and the repository."""

import pytest

from codegen_core.core.errors import PolicyViolation
from codegen_core.core.policy import PolicyEngine
from codegen_core.tools.file_write_guard import GuardedFS, audit_changeset


@pytest.fixture
def guard(cfg, tmp_path):
    root = tmp_path / "ws"
    root.mkdir()
    policy = PolicyEngine(cfg, journal=None)
    return GuardedFS(root, ["app/services/*", "tests/*"], policy, loc_budget=50)


def test_write_inside_whitelist_succeeds(guard):
    guard.write_file("app/services/exporter.py", "x = 1\n")
    assert guard.summary()["created_files"] == ["app/services/exporter.py"]


def test_write_outside_whitelist_is_refused(guard):
    with pytest.raises(PolicyViolation, match="outside the Impact Manifest"):
        guard.write_file("app/api/users.py", "x = 1\n")


def test_path_traversal_is_refused(guard):
    with pytest.raises(PolicyViolation, match="escapes the workspace"):
        guard.write_file("../../etc/passwd", "boom")


def test_deny_glob_beats_whitelist(cfg, tmp_path):
    """A deny glob must win even when the whitelist would allow the path."""
    root = tmp_path / "ws"
    root.mkdir()
    policy = PolicyEngine(cfg, journal=None)
    g = GuardedFS(root, ["**"], policy, loc_budget=50)
    with pytest.raises(PolicyViolation, match="deny glob"):
        g.write_file(".env.production", "SECRET=1")


def test_migrations_are_blocked_without_signoff(cfg, tmp_path):
    root = tmp_path / "ws"
    root.mkdir()
    policy = PolicyEngine(cfg, journal=None)
    g = GuardedFS(root, ["db/migrations/*"], policy, loc_budget=50)
    with pytest.raises(PolicyViolation, match="human signoff"):
        g.write_file("db/migrations/001_add_column.py", "pass\n")


def test_loc_budget_is_enforced(guard):
    with pytest.raises(PolicyViolation, match="budget"):
        guard.write_file("app/services/big.py", "x\n" * 200)


def test_post_hoc_audit_catches_out_of_scope_dev_tool_edits(cfg):
    """The weaker path used for backends that write to disk themselves."""
    policy = PolicyEngine(cfg, journal=None)
    changeset = {"changed_files": ["app/api/users.py"], "created_files": [], "changed_loc": 10}
    violations = audit_changeset(changeset, ["app/services/*"], policy)
    assert violations and "outside the Impact Manifest" in violations[0]
