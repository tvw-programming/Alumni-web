"""Getting the run's work onto a branch a pull request can be opened from.

Before this existed the pipeline edited a working copy and step 22 asked GitHub
to open a pull request from a branch nobody had created, which fails with a 422
about a missing head. These cover the three things that had to be added: a tree
per run, a commit that contains only what policy approved, and a push that
refuses rather than overwrites.

The push tests run against a real local bare repository standing in for the
remote, so `git` itself decides whether the branch, the commit and the author
came out right — a mock would only prove the arguments were formatted.
"""

from __future__ import annotations

import subprocess
from pathlib import Path
from types import SimpleNamespace

import pytest

from codegen_core.core.errors import VcsError
from codegen_core.plugins.vcs_github import GitHubPlugin

TOKEN_ENV = "GITHUB_TOKEN"


def git(*argv: str, cwd: Path) -> str:
    proc = subprocess.run(
        ["git", *argv], cwd=cwd, capture_output=True, text=True, timeout=60, check=True
    )
    return proc.stdout.strip()


@pytest.fixture
def origin(tmp_path: Path) -> Path:
    """A bare repository playing the part of the remote."""
    path = tmp_path / "origin.git"
    path.mkdir()
    git("init", "--bare", "--initial-branch=main", cwd=path)
    return path


@pytest.fixture
def source(tmp_path: Path, origin: Path) -> Path:
    """The project checkout, with one commit on main, pushed to origin."""
    path = tmp_path / "project"
    path.mkdir()
    git("init", "--initial-branch=main", cwd=path)
    git("config", "user.email", "seed@example.com", cwd=path)
    git("config", "user.name", "Seed", cwd=path)
    (path / "app").mkdir()
    (path / "app" / "existing.py").write_text("x = 1\n")
    git("add", "-A", cwd=path)
    git("commit", "-m", "initial", cwd=path)
    git("remote", "add", "origin", str(origin), cwd=path)
    git("push", "origin", "main", cwd=path)
    return path


def plugin(origin: Path | None = None, **overrides) -> GitHubPlugin:
    defaults = {
        "driver": "github",
        "repo": "acme/canonical",
        "base_branch": "main",
        "dry_run": False,
        "auth": {"token_env": TOKEN_ENV},
    }
    cfg = SimpleNamespace(**{**defaults, **overrides})
    vcs = GitHubPlugin(cfg, None)
    if origin is not None:
        # The only seam: the URL builder is unit-tested separately, and this
        # points the real git commands at a real local remote.
        vcs._remote_url = lambda repo, token: str(origin)  # type: ignore[assignment]
    return vcs


# --------------------------------------------------------------------------- #
# a tree per run
# --------------------------------------------------------------------------- #
def test_the_run_gets_its_own_clone_on_the_base_branch(tmp_path, source):
    destination = tmp_path / "workspace" / "DEEP-1042-abc123"

    result = plugin().prepare_worktree(source, destination, base="main")

    assert result["reused"] is False
    assert (destination / "app" / "existing.py").exists()
    assert git("rev-parse", "--abbrev-ref", "HEAD", cwd=destination) == "main"
    # The source is untouched: that is the whole point of cloning.
    assert git("rev-parse", "--abbrev-ref", "HEAD", cwd=source) == "main"


def test_preparing_twice_keeps_the_work_already_in_the_tree(tmp_path, source):
    """A resume must not wipe what the steps before it produced."""
    destination = tmp_path / "workspace" / "DEEP-1042-abc123"
    vcs = plugin()
    vcs.prepare_worktree(source, destination, base="main")
    (destination / "app" / "wip.py").write_text("half done\n")

    result = vcs.prepare_worktree(source, destination, base="main")

    assert result["reused"] is True
    assert (destination / "app" / "wip.py").read_text() == "half done\n"


def test_a_base_branch_that_does_not_exist_says_so(tmp_path, source):
    """Silently branching off whatever HEAD points at is how a run ends up
    proposing somebody else's feature branch."""
    destination = tmp_path / "workspace" / "DEEP-1042-abc123"

    with pytest.raises(VcsError, match="base branch 'release/9.9' does not exist"):
        plugin().prepare_worktree(source, destination, base="release/9.9")


# --------------------------------------------------------------------------- #
# the commit
# --------------------------------------------------------------------------- #
def test_the_commit_contains_only_the_paths_it_was_given(tmp_path, source, origin, monkeypatch):
    """A cli_agent backend can write outside GuardedFS; staging the whole tree
    would carry those files into the pull request."""
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    workspace = tmp_path / "ws"
    vcs = plugin(origin)
    vcs.prepare_worktree(source, workspace, base="main")
    (workspace / "app" / "wanted.py").write_text("wanted\n")
    (workspace / "app" / "sneaked.py").write_text("not approved\n")

    result = vcs.publish_branch(
        workspace,
        branch="codegen/DEEP-1042",
        paths=["app/wanted.py"],
        message="DEEP-1042: export",
        author=("dana.o", "dana.o@acme.com"),
    )

    assert result["pushed"] is True
    committed = git("show", "--name-only", "--format=", result["sha"], cwd=workspace)
    assert committed.split() == ["app/wanted.py"]
    assert git("status", "--porcelain", cwd=workspace).strip().startswith("??")


def test_the_commit_is_authored_by_the_person_who_started_the_run(
    tmp_path, source, origin, monkeypatch
):
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    workspace = tmp_path / "ws"
    vcs = plugin(origin)
    vcs.prepare_worktree(source, workspace, base="main")
    (workspace / "app" / "wanted.py").write_text("wanted\n")

    vcs.publish_branch(
        workspace,
        branch="codegen/DEEP-1042",
        paths=["app/wanted.py"],
        message="DEEP-1042: export",
        author=("dana.o", "dana.o@acme.com"),
    )

    assert git("log", "-1", "--format=%an <%ae>", cwd=workspace) == "dana.o <dana.o@acme.com>"


def test_the_branch_reaches_the_remote(tmp_path, source, origin, monkeypatch):
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    workspace = tmp_path / "ws"
    vcs = plugin(origin)
    vcs.prepare_worktree(source, workspace, base="main")
    (workspace / "app" / "wanted.py").write_text("wanted\n")

    vcs.publish_branch(
        workspace,
        branch="codegen/DEEP-1042",
        paths=["app/wanted.py"],
        message="DEEP-1042: export",
        author=("dana.o", "dana.o@acme.com"),
    )

    assert "codegen/DEEP-1042" in git("branch", "--list", "codegen/*", cwd=origin)


def test_an_existing_remote_branch_is_refused_not_overwritten(
    tmp_path, source, origin, monkeypatch
):
    """The decision was refuse-and-stop: a re-run must not destroy commits
    somebody pushed onto that branch by hand."""
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    workspace = tmp_path / "ws"
    vcs = plugin(origin)
    vcs.prepare_worktree(source, workspace, base="main")
    (workspace / "app" / "wanted.py").write_text("wanted\n")
    vcs.publish_branch(
        workspace, branch="codegen/DEEP-1042", paths=["app/wanted.py"],
        message="first", author=("dana.o", "dana.o@acme.com"),
    )

    second = tmp_path / "ws2"
    vcs.prepare_worktree(source, second, base="main")
    (second / "app" / "wanted.py").write_text("different\n")

    with pytest.raises(VcsError, match="already exists"):
        vcs.publish_branch(
            second, branch="codegen/DEEP-1042", paths=["app/wanted.py"],
            message="second", author=("dana.o", "dana.o@acme.com"),
        )


def test_an_empty_changeset_is_refused(tmp_path, source, origin, monkeypatch):
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    workspace = tmp_path / "ws"
    vcs = plugin(origin)
    vcs.prepare_worktree(source, workspace, base="main")

    with pytest.raises(VcsError, match="nothing to commit"):
        vcs.publish_branch(
            workspace, branch="codegen/DEEP-1042", paths=[],
            message="empty", author=("dana.o", "dana.o@acme.com"),
        )


# --------------------------------------------------------------------------- #
# dry run
# --------------------------------------------------------------------------- #
def test_a_dry_run_writes_nothing_to_git(tmp_path, source):
    """The offline profile has to stay runnable, free, and side-effect free."""
    workspace = tmp_path / "ws"
    vcs = plugin(dry_run=True)
    vcs.prepare_worktree(source, workspace, base="main")
    before = git("rev-parse", "HEAD", cwd=workspace)
    (workspace / "app" / "wanted.py").write_text("wanted\n")

    result = vcs.publish_branch(
        workspace, branch="codegen/DEEP-1042", paths=["app/wanted.py"],
        message="m", author=("", ""),
    )

    assert result == {
        "branch": "codegen/DEEP-1042", "sha": "", "repo": "acme/canonical",
        "pushed": False, "dry_run": True, "files": ["app/wanted.py"],
    }
    assert git("rev-parse", "HEAD", cwd=workspace) == before
    assert git("branch", "--list", "codegen/*", cwd=workspace) == ""


def test_no_token_falls_back_to_a_dry_run(tmp_path, source, monkeypatch):
    monkeypatch.delenv(TOKEN_ENV, raising=False)
    workspace = tmp_path / "ws"
    vcs = plugin()
    vcs.prepare_worktree(source, workspace, base="main")

    result = vcs.publish_branch(
        workspace, branch="b", paths=["app/existing.py"], message="m", author=("", "")
    )

    assert result["dry_run"] is True and result["pushed"] is False


# --------------------------------------------------------------------------- #
# cross-repository
# --------------------------------------------------------------------------- #
def test_the_branch_is_pushed_to_the_head_repo_not_the_target(monkeypatch, tmp_path, source):
    """A fork PR pushes to the fork and opens against upstream."""
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    seen = {}
    vcs = plugin(head_repo="contractor/fork")
    vcs._remote_url = lambda repo, token: seen.setdefault("repo", repo) or "unused"
    vcs.branch_exists_on_remote = lambda *a, **k: True  # stop before pushing

    workspace = tmp_path / "ws"
    plugin().prepare_worktree(source, workspace, base="main")
    with pytest.raises(VcsError, match="already exists"):
        vcs.publish_branch(
            workspace, branch="b", paths=["app/existing.py"],
            message="m", author=("d", "d@a.com"),
        )

    assert seen == {}, "branch_exists_on_remote was stubbed, so no URL is built yet"
    assert vcs.target_repo() == "acme/canonical"


def test_a_separate_token_can_be_configured_for_the_head_repo(monkeypatch, tmp_path, source):
    monkeypatch.delenv(TOKEN_ENV, raising=False)
    monkeypatch.setenv("FORK_TOKEN", "fork-token")
    workspace = tmp_path / "ws"
    vcs = plugin(head_repo="contractor/fork", head_token_env="FORK_TOKEN")
    vcs.prepare_worktree(source, workspace, base="main")
    (workspace / "app" / "existing.py").write_text("changed by the run\n")
    vcs.branch_exists_on_remote = lambda *a, **k: False
    vcs._remote_url = lambda repo, token: str(tmp_path / "origin.git")

    # The target repo's token is absent; publishing still proceeds, which is
    # only possible if the head repo's own token was the one consulted.
    result = vcs.publish_branch(
        workspace, branch="codegen/x", paths=["app/existing.py"],
        message="m", author=("d", "d@a.com"),
    )

    assert result["dry_run"] is False
    assert result["repo"] == "contractor/fork"


# --------------------------------------------------------------------------- #
# the token never leaks
# --------------------------------------------------------------------------- #
def test_a_push_failure_does_not_repeat_the_token(tmp_path, source, monkeypatch):
    monkeypatch.setenv(TOKEN_ENV, "s3cret-token")
    workspace = tmp_path / "ws"
    vcs = plugin()
    vcs.prepare_worktree(source, workspace, base="main")
    (workspace / "app" / "wanted.py").write_text("wanted\n")
    vcs.branch_exists_on_remote = lambda *a, **k: False
    vcs._remote_url = lambda repo, token: f"https://x-access-token:{token}@nowhere.invalid/{repo}.git"

    with pytest.raises(VcsError) as caught:
        vcs.publish_branch(
            workspace, branch="codegen/x", paths=["app/wanted.py"],
            message="m", author=("d", "d@a.com"),
        )

    # git redacts credentials from its own error output, and `_scrub` is the
    # belt to that braces: neither may put the token in front of a reader.
    assert "s3cret-token" not in str(caught.value)


# --------------------------------------------------------------------------- #
# what step 22 refuses to commit
# --------------------------------------------------------------------------- #
def test_step_22_refuses_to_commit_outside_the_impact_manifest(cfg, ctx):
    """The GuardedFS bypass, caught before it reaches a commit.

    A `cli_agent` backend with `edits_files_directly` writes to disk itself, so
    the working tree can hold changes step 09 never authorised. Filtering them
    out silently would ship a pull request missing part of its own change, so
    this halts and names them instead.
    """
    from codegen_core.core.errors import PolicyViolation
    from codegen_core.steps._loader import load_steps

    step22 = load_steps(cfg)[22]
    ctx.remember("ImpactManifestV1", {"allowed_paths": ["app/services/*"]})
    paths = ["app/services/exporter.py", "deploy/production.tf"]

    with pytest.raises(PolicyViolation) as caught:
        step22._assert_inside_write_scope(ctx, paths)

    message = str(caught.value)
    assert "wrote outside GuardedFS" in message
    assert "deploy/production.tf" in message
    assert "app/services/exporter.py" not in message, "the allowed path is not at fault"


def test_step_22_allows_a_changeset_inside_the_manifest(cfg, ctx):
    from codegen_core.steps._loader import load_steps

    step22 = load_steps(cfg)[22]
    ctx.remember("ImpactManifestV1", {"allowed_paths": ["app/services/*", "tests/*"]})

    step22._assert_inside_write_scope(
        ctx, ["app/services/exporter.py", "tests/test_exporter.py"]
    )  # must not raise


def test_step_22_collects_changed_and_created_files_once(cfg):
    from codegen_core.steps._loader import load_steps

    step22 = load_steps(cfg)[22]

    paths = step22._changed_paths({
        "changed_files": ["app/a.py", "app/b.py"],
        "created_files": ["app/b.py", "app/c.py", ""],
    })

    assert paths == ["app/a.py", "app/b.py", "app/c.py"]


# --------------------------------------------------------------------------- #
# end to end
# --------------------------------------------------------------------------- #
def _publishing_config(tmp_path, raw_config, source):
    """A config with a real project checkout and publication switched on."""
    import json

    from codegen_core.core.config import ConfigLoader

    raw_config["app"]["paths"] = {
        "artifacts": str(tmp_path / "artifacts" / "{job_id}"),
        "runs": str(tmp_path / "runs" / "{job_id}"),
        "workspace": str(tmp_path / "workspace" / "{job_id}"),
        "prompts": str(Path(__file__).resolve().parents[1] / "config" / "prompts"),
        "schema_registry": str(tmp_path / "schemas"),
    }
    raw_config["app"]["project"]["path"] = str(source)
    raw_config["plugins"]["vcs"]["repo"] = "acme/canonical"
    raw_config["plugins"]["vcs"]["dry_run"] = False
    # The local profile dry-runs every plugin — which is exactly why the offline
    # pipeline touches no git — so the vcs entry has to be switched on there too.
    raw_config["profiles"]["local"]["plugins"]["vcs"]["dry_run"] = False
    # job_id already carries the story number, so this is the usual template.
    raw_config["plugins"]["vcs"]["branch_template"] = "codegen/{job_id}"
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw_config))
    return ConfigLoader.load(path)


def test_the_runner_gives_the_run_its_own_clone(tmp_path, raw_config, source, monkeypatch):
    """Runs stop sharing one checkout, which is what made two at once unsafe."""
    from codegen_core.core.context import JobContext
    from codegen_core.orchestrator.runner import PipelineRunner

    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    cfg = _publishing_config(tmp_path, raw_config, source)
    ctx = JobContext.create(cfg, "DEEP-1042")
    ctx.journal.append_event("run_requested", started_by="dana.o@acme.com")

    PipelineRunner(cfg).prepare(ctx)

    assert ctx.workspace == tmp_path / "workspace" / ctx.job_id
    assert (ctx.workspace / "app" / "existing.py").exists()
    assert git("rev-parse", "--abbrev-ref", "HEAD", cwd=ctx.workspace) == "main"
    # The project checkout is read, never written: no branch, no dirty tree.
    assert git("status", "--porcelain", cwd=source) == ""
    assert git("rev-parse", "--abbrev-ref", "HEAD", cwd=source) == "main"
    assert any(e.get("event") == "workspace_cloned" for e in ctx.journal.entries())


def test_step_22_commits_the_run_and_pushes_it_before_opening_the_pr(
    tmp_path, raw_config, source, origin, monkeypatch
):
    """The case that was broken end to end.

    Step 22 used to ask GitHub for a pull request from a branch that had never
    been created. Now it commits the changeset, pushes the branch, and only then
    opens the PR — against a real local remote, so git decides whether it worked.
    """
    from codegen_core.core.context import JobContext
    from codegen_core.core.envelope import ComponentRef, Envelope, Intent
    from codegen_core.orchestrator.runner import PipelineRunner
    from codegen_core.steps._loader import load_steps

    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    monkeypatch.setenv(TOKEN_ENV, "t0ken")
    monkeypatch.setattr(GitHubPlugin, "_remote_url", lambda self, repo, token: str(origin))
    # Opening the PR is a network call covered in test_pull_request_target.py;
    # this test is about everything that has to happen before it.
    monkeypatch.setattr(
        GitHubPlugin, "open_pull_request",
        lambda self, **kw: {"number": 7, "url": "https://example/pr/7", **kw},
    )

    cfg = _publishing_config(tmp_path, raw_config, source)
    ctx = JobContext.create(cfg, "DEEP-1042")
    ctx.journal.append_event("run_requested", started_by="dana.o@acme.com")
    PipelineRunner(cfg).prepare(ctx)

    # Stand in for steps 09 and 12: an approved path, and work in the tree.
    (ctx.workspace / "app" / "services").mkdir(parents=True, exist_ok=True)
    (ctx.workspace / "app" / "services" / "exporter.py").write_text("def export():\n    ...\n")
    ctx.remember("ImpactManifestV1", {"allowed_paths": ["app/services/*"]})
    ctx.remember("CodeChangesetV1", {"created_files": ["app/services/exporter.py"]})
    ctx.remember("BrdV1", {"title": "Allow users to export"})

    step22 = load_steps(cfg)[22]
    env = Envelope(
        correlation_id="c",
        sender=ComponentRef(name="runner", kind="orchestrator"),
        recipient=ComponentRef(step=22, name=step22.name, kind="plugin"),
        intent=Intent.REQUEST,
    )
    out = step22.handle(env, ctx)

    branch = f"codegen/{ctx.job_id}"
    assert out.status == "OK"
    assert branch in git("branch", "--list", "codegen/*", cwd=origin)
    assert git("log", "-1", "--format=%an <%ae>", branch, cwd=origin) == "dana.o <dana.o@acme.com>"
    assert git("show", "--name-only", "--format=", branch, cwd=origin).split() == [
        "app/services/exporter.py"
    ]

    pr = ctx.recall("PullRequestV1")
    assert pr["commit"] == git("rev-parse", branch, cwd=origin)
    # The field has been on the schema since it was written, always empty.
    assert ctx.recall("CodeChangesetV1")["commits"] == [pr["commit"]]
    assert any(e.get("event") == "branch_published" for e in ctx.journal.entries())
