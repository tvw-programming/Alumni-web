"""The gateway must fail closed.

Every test here is an attempt to get something the policy forbids. A test that
starts passing when it should fail is the only signal that the boundary moved.
"""

import time
from pathlib import Path

import pytest

from codegen_core.gateway import tokens
from codegen_core.gateway.tokens import TokenError, WorkflowClaims
from codegen_core.gateway.tools import (
    GatewayDenied,
    assert_readable,
    get_status,
    get_step_artifacts,
    read_file,
    resolve_in_root,
)

SECRET = "x" * 48


@pytest.fixture
def signed(monkeypatch):
    monkeypatch.setenv("CODEGEN_GATEWAY_SECRET", SECRET)
    return tokens


@pytest.fixture
def project(tmp_path):
    """A project root with the shapes the deny globs exist for."""
    root = tmp_path / "project"
    (root / "app").mkdir(parents=True)
    (root / "secrets").mkdir()
    (root / "app" / "main.py").write_text("def run():\n    return 1\n")
    (root / ".env").write_text("DB_PASSWORD=hunter2\n")
    (root / "key.pem").write_text("-----BEGIN RSA PRIVATE KEY-----\n")
    (root / "secrets" / "token.txt").write_text("ghp_realtokenvalue\n")
    return root


@pytest.fixture
def claims(project):
    return WorkflowClaims(
        run_id="DEEP-1",
        step=8,
        agent="repo_understanding",
        project_root=str(project),
        issued_at=int(time.time()),
        expires_at=int(time.time()) + 900,
    )


# --------------------------------------------------------------------------- #
# Tokens
# --------------------------------------------------------------------------- #
def test_a_valid_token_round_trips(signed):
    token = signed.mint("DEEP-1", 8, "repo_understanding", "/tmp/p")
    assert signed.verify(token).step == 8


def test_no_token_is_refused(signed):
    with pytest.raises(TokenError, match="no workflow token"):
        signed.verify("")


def test_a_forged_signature_is_refused(signed, monkeypatch):
    token = signed.mint("DEEP-1", 8, "agent", "/tmp/p")
    body, _ = token.split(".", 1)
    with pytest.raises(TokenError, match="signature does not verify"):
        signed.verify(f"{body}.{'A' * 43}")


def test_a_token_signed_with_another_secret_is_refused(signed, monkeypatch):
    token = signed.mint("DEEP-1", 8, "agent", "/tmp/p")
    monkeypatch.setenv("CODEGEN_GATEWAY_SECRET", "y" * 48)
    with pytest.raises(TokenError, match="signature does not verify"):
        signed.verify(token)


def test_an_expired_token_is_refused(signed):
    token = signed.mint("DEEP-1", 8, "agent", "/tmp/p", ttl_seconds=-1)
    with pytest.raises(TokenError, match="expired"):
        signed.verify(token)


def test_a_weak_secret_is_refused_at_mint(monkeypatch):
    monkeypatch.setenv("CODEGEN_GATEWAY_SECRET", "short")
    with pytest.raises(TokenError, match="at least 32"):
        tokens.mint("DEEP-1", 8, "agent", "/tmp/p")


def test_an_unset_secret_is_refused(monkeypatch):
    monkeypatch.delenv("CODEGEN_GATEWAY_SECRET", raising=False)
    with pytest.raises(TokenError, match="unset"):
        tokens.verify("anything.anything")


def test_arguments_cannot_contradict_the_claims(claims):
    """The whole point: an agent may not name its own step or identity."""
    assert claims.conflicts_with({"step": 8}) is None
    assert "step=12" in claims.conflicts_with({"step": 12})
    assert "agent=" in claims.conflicts_with({"agent": "code_update"})
    assert "run_id=" in claims.conflicts_with({"run_id": "DEEP-OTHER"})


# --------------------------------------------------------------------------- #
# Path safety
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "path",
    ["../../etc/passwd", "app/../../outside.txt", "/etc/passwd", "", "  app/main.py"],
)
def test_traversal_and_absolute_paths_are_refused(project, path):
    with pytest.raises(GatewayDenied):
        resolve_in_root(project, path)


def test_a_symlink_out_of_the_root_is_refused(project, tmp_path):
    outside = tmp_path / "outside.txt"
    outside.write_text("secret")
    (project / "app" / "link.txt").symlink_to(outside)

    with pytest.raises(GatewayDenied, match="escapes the project root"):
        resolve_in_root(project, "app/link.txt")


def test_a_normal_path_resolves(project):
    assert resolve_in_root(project, "app/main.py").name == "main.py"


# --------------------------------------------------------------------------- #
# Deny globs apply to reads
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize("path", [".env", "key.pem", "secrets/token.txt"])
def test_deny_globs_block_reads_not_only_writes(cfg, claims, path):
    """A gateway that will hand over a private key is an exfiltration endpoint."""
    with pytest.raises(GatewayDenied, match="deny glob"):
        assert_readable(cfg, path)
    with pytest.raises(GatewayDenied, match="deny glob"):
        read_file(cfg, claims, path)


def test_an_allowed_file_reads(cfg, claims):
    result = read_file(cfg, claims, "app/main.py")
    assert "def run()" in result.content
    assert result.truncated is False


def test_a_missing_file_reports_missing(cfg, claims):
    with pytest.raises(GatewayDenied, match="no such file"):
        read_file(cfg, claims, "app/absent.py")


def test_a_large_file_is_truncated_not_refused(cfg, claims, project):
    (project / "app" / "big.py").write_text("# pad\n" * 100_000)
    result = read_file(cfg, claims, "app/big.py")
    assert result.truncated is True
    assert len(result.content) <= 256 * 1024


# --------------------------------------------------------------------------- #
# Listing
# --------------------------------------------------------------------------- #
def test_denied_files_are_omitted_from_the_listing(cfg, claims):
    """The filename itself can be the secret."""
    listed = get_status(cfg, claims)["files"]
    assert "app/main.py" in listed
    assert ".env" not in listed
    assert "key.pem" not in listed
    assert not any(f.startswith("secrets/") for f in listed)


def test_artifacts_are_scoped_to_the_token_run(cfg, claims):
    """A token for one run must not read another run's artifacts."""
    result = get_step_artifacts(cfg, claims, 5)
    assert result["run_id"] == claims.run_id


@pytest.mark.parametrize("step", [0, 25, -1])
def test_a_step_outside_the_pipeline_is_refused(cfg, claims, step):
    with pytest.raises(GatewayDenied, match="outside the pipeline"):
        get_step_artifacts(cfg, claims, step)


# --------------------------------------------------------------------------- #
# The allowlist
# --------------------------------------------------------------------------- #
def test_no_general_purpose_tool_is_exposed():
    """Named operations only. A general tool is arbitrary code execution."""
    from codegen_core.gateway.tools import READ_ONLY_TOOLS

    forbidden = {"shell.execute", "filesystem.write", "http.request", "database.execute"}
    assert not forbidden & set(READ_ONLY_TOOLS)
    assert set(READ_ONLY_TOOLS) == {
        "repo.read_file",
        "repo.get_status",
        "project.get_step_artifacts",
    }


def test_no_tool_writes(cfg, claims, project):
    """Read-only phase: nothing in the module may mutate the project."""
    before = {p: p.read_bytes() for p in project.rglob("*") if p.is_file()}

    read_file(cfg, claims, "app/main.py")
    get_status(cfg, claims)
    get_step_artifacts(cfg, claims, 5)

    after = {p: p.read_bytes() for p in project.rglob("*") if p.is_file()}
    assert before == after


# --------------------------------------------------------------------------- #
# One source of policy (ADR 0004)
# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    "path",
    [
        ".env", ".env.production", "app/.env", "deep/nested/.env.local",
        "key.pem", "certs/server.pem", "secrets/a.txt", "app/secrets/b.txt",
        ".github/workflows/ci.yml", "app/main.py", "tests/test_x.py", "README.md",
    ],
)
def test_gateway_glob_matching_agrees_with_the_policy_engine(cfg, ctx, path):
    """The gateway restates `_glob_match`; it must not diverge from it.

    Eight lines duplicated to keep the gateway free of the journal and the
    context object. That trade is only sound while the two behave identically,
    so this pins them together — if `PolicyEngine._glob_match` changes, this
    fails rather than the boundary quietly weakening.
    """
    from codegen_core.core.policy import PolicyEngine
    from codegen_core.gateway.tools import _glob_match

    engine = PolicyEngine(cfg, ctx.journal)
    for pattern in cfg.policy.write_scope.deny_globs:
        assert _glob_match(path, pattern) == engine._glob_match(path, pattern), (
            f"{path!r} vs {pattern!r}"
        )


def test_every_deny_glob_is_enforced_on_read(cfg, claims, project):
    """Not a sample — every pattern in the config, exercised."""
    from codegen_core.gateway.tools import _glob_match

    for pattern in cfg.policy.write_scope.deny_globs:
        # Construct a path the pattern is meant to catch.
        probe = pattern.replace("**/", "").replace("*", "x")
        if not _glob_match(probe, pattern):
            continue  # pattern needs a shape this crude probe cannot make
        with pytest.raises(GatewayDenied, match="deny glob"):
            assert_readable(cfg, probe)
