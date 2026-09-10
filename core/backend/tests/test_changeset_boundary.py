"""What step 12 reports as the run's work.

Everything downstream traces to this artifact: step 13 reviews it, step 22
commits it, and a human approves it at gate 24. Two bugs made it untrustworthy,
and both are pinned here.

**The boundary.** Git answers about the repository it finds by walking up. The
default workspace, `./workspace/{job_id}`, sits inside this very repository, so
`git status` there described *this* repository. A recorded run claimed 25 changed
files and 1703 lines that were somebody's unrelated edits to the orchestrator,
and passed them to review as the story's implementation.

**The parsing.** Porcelain records are two status characters, a space, then the
path. Splitting on the first space instead produced filenames like
`M core/backend/config/prompts/07_test_design.system.md`.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

from codegen_core.plugins.vcs_github import GitHubPlugin
from codegen_core.tools.diff_tools import parse_porcelain, repo_scope


def git(*argv: str, cwd: Path) -> str:
    return subprocess.run(
        ["git", *argv], cwd=cwd, capture_output=True, text=True, timeout=60, check=True
    ).stdout.strip()


def vcs() -> GitHubPlugin:
    return GitHubPlugin(SimpleNamespace(driver="github", dry_run=True), None)


@pytest.fixture
def outer(tmp_path: Path) -> Path:
    """A repository with a dirty working tree, standing in for CodeGen2."""
    path = tmp_path / "outer"
    path.mkdir()
    git("init", "--initial-branch=main", cwd=path)
    git("config", "user.email", "s@e.com", cwd=path)
    git("config", "user.name", "S", cwd=path)
    (path / "orchestrator.py").write_text("original\n")
    git("add", "-A", cwd=path)
    git("commit", "-m", "init", cwd=path)
    # Somebody's unrelated edits, exactly the situation that caused the bug.
    (path / "orchestrator.py").write_text("edited by a human\n")
    (path / "notes.md").write_text("scratch\n")
    return path


# --------------------------------------------------------------------------- #
# the boundary
# --------------------------------------------------------------------------- #
def test_a_scratch_workspace_does_not_report_the_repository_around_it(outer):
    """The bug, reproduced: `./workspace/{job_id}` inside a checkout.

    Nothing wrote here, so the honest answer is nothing. Before the fix this
    returned the outer repository's dirty files as the run's own work.
    """
    workspace = outer / "workspace" / "DEEP-1042-abc123"
    workspace.mkdir(parents=True)

    snapshot = vcs().snapshot_changes(workspace)

    assert snapshot["changed_files"] == []
    assert snapshot["created_files"] == []
    assert snapshot["changed_loc"] == 0
    # It says which repository answered, so the artifact cannot mislead silently.
    assert snapshot["repo_root"] == str(outer)
    assert snapshot["workspace_is_repo_root"] is False


def test_a_workspace_reports_its_own_work_only(outer):
    workspace = outer / "workspace" / "DEEP-1042-abc123"
    workspace.mkdir(parents=True)
    (workspace / "app").mkdir()
    (workspace / "app" / "exporter.py").write_text("def export(): ...\n")

    snapshot = vcs().snapshot_changes(workspace)

    # Its own file, workspace-relative — not `workspace/DEEP-1042-abc123/app/...`
    assert snapshot["created_files"] == ["app/exporter.py"]
    assert "orchestrator.py" not in snapshot["changed_files"]
    assert "notes.md" not in snapshot["created_files"]


def test_a_monorepo_package_reports_its_own_subtree(outer):
    """The alumni case: a product folder inside a larger repository.

    Its real edits must be reported — and only its own.
    """
    package = outer / "apps" / "react-web"
    (package / "src").mkdir(parents=True)
    (package / "src" / "AlumniAdminGrid.tsx").write_text("export const Grid = () => null;\n")
    git("add", "-A", cwd=outer)
    git("commit", "-m", "add package", cwd=outer)
    (package / "src" / "AlumniAdminGrid.tsx").write_text("export const Grid = () => <div/>;\n")
    (package / "src" / "New.tsx").write_text("export const New = () => null;\n")

    snapshot = vcs().snapshot_changes(package)

    assert snapshot["changed_files"] == ["src/AlumniAdminGrid.tsx"]
    assert snapshot["created_files"] == ["src/New.tsx"]
    assert snapshot["workspace_is_repo_root"] is False


def test_a_repository_of_its_own_reports_everything_in_it(tmp_path):
    """The clone-per-run case: the workspace *is* the repository root."""
    path = tmp_path / "clone"
    path.mkdir()
    git("init", "--initial-branch=main", cwd=path)
    git("config", "user.email", "s@e.com", cwd=path)
    git("config", "user.name", "S", cwd=path)
    (path / "a.py").write_text("one\n")
    git("add", "-A", cwd=path)
    git("commit", "-m", "init", cwd=path)
    (path / "a.py").write_text("two\n")

    snapshot = vcs().snapshot_changes(path)

    assert snapshot["changed_files"] == ["a.py"]
    assert snapshot["workspace_is_repo_root"] is True
    assert snapshot["changed_loc"] > 0


def test_a_workspace_outside_any_repository_reports_nothing(tmp_path):
    """Step 12 then falls back to GuardedFS's own record, which is better."""
    workspace = tmp_path / "loose"
    workspace.mkdir()
    (workspace / "written.py").write_text("x = 1\n")

    snapshot = vcs().snapshot_changes(workspace)

    assert snapshot["changed_files"] == []
    assert snapshot["created_files"] == []
    assert snapshot["repo_root"] == ""


def test_repo_scope_locates_the_root_and_the_prefix(outer):
    package = outer / "apps" / "react-web"
    package.mkdir(parents=True)

    root, prefix = repo_scope(package)

    assert root == outer
    assert prefix == "apps/react-web/"


def test_repo_scope_on_nothing(tmp_path):
    assert repo_scope(tmp_path / "loose") == (None, "")


# --------------------------------------------------------------------------- #
# the parsing
# --------------------------------------------------------------------------- #
def test_a_modified_file_keeps_its_own_name():
    """The bug that produced `M core/backend/.../07_test_design.system.md`."""
    changed, created = parse_porcelain(" M app/services/exporter.py\0")

    assert changed == ["app/services/exporter.py"]
    assert created == []


@pytest.mark.parametrize(
    "record,expected",
    [
        (" M app/a.py", ("changed", "app/a.py")),
        ("M  app/a.py", ("changed", "app/a.py")),
        ("MM app/a.py", ("changed", "app/a.py")),
        (" D app/gone.py", ("changed", "app/gone.py")),
        ("?? app/new.py", ("created", "app/new.py")),
        ("A  app/added.py", ("created", "app/added.py")),
    ],
)
def test_every_status_code_lands_in_the_right_list(record, expected):
    changed, created = parse_porcelain(record + "\0")
    bucket, path = expected

    assert (changed if bucket == "changed" else created) == [path]
    assert (created if bucket == "changed" else changed) == []


def test_a_rename_does_not_become_two_files():
    """`-z` emits the old path as its own record; it is not another change."""
    changed, created = parse_porcelain("R  app/new.py\0app/old.py\0")

    assert created == ["app/new.py"]
    assert changed == [], "the source path must not be read as a separate file"


def test_a_path_containing_a_space_survives():
    """The reason for `-z`: git would otherwise quote this."""
    changed, _ = parse_porcelain(" M app/some file.py\0")

    assert changed == ["app/some file.py"]


def test_paths_are_made_relative_to_the_workspace():
    changed, created = parse_porcelain(
        " M apps/react-web/src/Grid.tsx\0?? apps/react-web/src/New.tsx\0",
        prefix="apps/react-web/",
    )

    assert changed == ["src/Grid.tsx"]
    assert created == ["src/New.tsx"]


def test_anything_outside_the_workspace_is_dropped():
    """Defence in depth behind `-- .`: a path above the workspace is not ours."""
    changed, created = parse_porcelain(
        " M core/backend/orchestrator.py\0?? apps/react-web/src/New.tsx\0",
        prefix="apps/react-web/",
    )

    assert changed == []
    assert created == ["src/New.tsx"]


def test_empty_output_is_no_changes():
    assert parse_porcelain("") == ([], [])
    assert parse_porcelain("\0\0") == ([], [])
