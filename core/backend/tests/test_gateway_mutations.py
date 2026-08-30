"""The write path. Every test is an attempt to get an unreviewed byte to disk."""

import json
import time

import pytest

from codegen_core.gateway.mutations import (
    EVENT_APPLIED,
    EVENT_REFUSED,
    FileWrite,
    apply_patch,
)
from codegen_core.gateway.tokens import WorkflowClaims
from codegen_core.gateway.tools import GatewayDenied

JUSTIFICATION = (
    "Change app/service.py to rotate the refresh token on re-auth, which "
    "acceptance criterion AC-2 requires."
)


@pytest.fixture
def project(tmp_path):
    root = tmp_path / "project"
    (root / "app").mkdir(parents=True)
    (root / "app" / "service.py").write_text("def run():\n    return 1\n")
    (root / ".env").write_text("DB_PASSWORD=hunter2\n")
    return root


@pytest.fixture
def claims(project):
    now = int(time.time())
    return WorkflowClaims(
        run_id="DEEP-MUT",
        step=12,
        agent="code_update",
        project_root=str(project),
        issued_at=now,
        expires_at=now + 900,
    )


def _apply(cfg, claims, writes, **overrides):
    kwargs = dict(
        writes=writes,
        expected_files=[w.path for w in writes],
        allowed_globs=["app/**", "tests/**"],
        loc_budget=300,
        idempotency_key="key-0001-abcd",
        justification=JUSTIFICATION,
    )
    kwargs.update(overrides)
    return apply_patch(cfg, claims, **kwargs)


def _events(cfg, run_id, kind):
    from codegen_core.core.journal import Journal

    return [e for e in Journal(cfg, run_id).entries() if e.get("event") == kind]


# --------------------------------------------------------------------------- #
def test_a_declared_write_lands(cfg, claims, project):
    result = _apply(cfg, claims, [FileWrite("app/service.py", "def run():\n    return 2\n")])

    assert result.status == "applied"
    assert (project / "app" / "service.py").read_text().endswith("return 2\n")
    assert _events(cfg, claims.run_id, EVENT_APPLIED)


def test_an_undeclared_write_is_refused(cfg, claims, project):
    """A write nobody declared is a write nobody reviewed."""
    with pytest.raises(GatewayDenied, match="not declared in expected_files"):
        apply_patch(
            cfg,
            claims,
            writes=[
                FileWrite("app/service.py", "x = 1\n"),
                FileWrite("app/sneaky.py", "backdoor = True\n"),
            ],
            expected_files=["app/service.py"],
            allowed_globs=["app/**"],
            loc_budget=300,
            idempotency_key="key-0002-abcd",
            justification=JUSTIFICATION,
        )
    assert not (project / "app" / "sneaky.py").exists()


def test_a_write_outside_the_whitelist_is_refused(cfg, claims, project):
    with pytest.raises(GatewayDenied):
        _apply(
            cfg,
            claims,
            [FileWrite("docs/notes.md", "hello\n")],
            allowed_globs=["app/**"],
        )
    assert not (project / "docs").exists()


@pytest.mark.parametrize("path", [".env", "key.pem", "secrets/x.txt"])
def test_deny_globs_stop_the_write(cfg, claims, project, path):
    with pytest.raises(GatewayDenied, match="deny glob"):
        _apply(cfg, claims, [FileWrite(path, "PASSWORD=changed\n")], allowed_globs=["**"])
    assert (project / ".env").read_text() == "DB_PASSWORD=hunter2\n"


@pytest.mark.parametrize("path", ["../outside.py", "/etc/passwd", "app/../../escape.py"])
def test_traversal_is_refused_before_anything_opens(cfg, claims, path):
    with pytest.raises(GatewayDenied):
        _apply(cfg, claims, [FileWrite(path, "x = 1\n")], expected_files=[path],
               allowed_globs=["**"])


def test_a_credential_in_the_content_never_reaches_disk(cfg, claims, project):
    """Gateway-level guardrails, so a caller that skipped its own cannot win."""
    with pytest.raises(GatewayDenied, match="guardrails"):
        _apply(
            cfg,
            claims,
            [FileWrite("app/service.py", "KEY = 'sk-live-abcdefghijklmnopqrstuvwx'\n")],
        )
    assert "sk-live" not in (project / "app" / "service.py").read_text()


def test_a_replayed_key_does_not_write_twice(cfg, claims, project):
    first = _apply(cfg, claims, [FileWrite("app/service.py", "v = 1\n")])
    assert first.status == "applied"

    second = _apply(cfg, claims, [FileWrite("app/service.py", "v = 2\n")])
    assert second.status == "replayed"
    # The second call's content never landed.
    assert (project / "app" / "service.py").read_text() == "v = 1\n"


def test_a_missing_idempotency_key_is_refused(cfg, claims):
    with pytest.raises(GatewayDenied, match="idempotency_key"):
        _apply(cfg, claims, [FileWrite("app/service.py", "x = 1\n")], idempotency_key="")


def test_a_generic_justification_is_refused_at_the_boundary(cfg, claims):
    """The gateway does not depend on the caller having checked."""
    with pytest.raises(GatewayDenied, match="justification"):
        _apply(cfg, claims, [FileWrite("app/service.py", "x = 1\n")], justification="Fix it")


def test_shadow_mode_validates_and_audits_without_writing(cfg, claims, project):
    """The whole point of shadow: same verdict, no side effect."""
    original = (project / "app" / "service.py").read_text()

    result = _apply(
        cfg, claims, [FileWrite("app/service.py", "v = 99\n")], dry_run=True
    )

    assert result.status == "applied"
    assert (project / "app" / "service.py").read_text() == original
    applied = _events(cfg, claims.run_id, EVENT_APPLIED)
    assert applied and applied[-1]["dry_run"] is True


def test_shadow_refuses_what_the_real_path_would_refuse(cfg, claims):
    """A verdict that differs between modes is worse than no shadow at all."""
    with pytest.raises(GatewayDenied, match="deny glob"):
        _apply(cfg, claims, [FileWrite(".env", "X=1\n")], allowed_globs=["**"], dry_run=True)


def test_every_refusal_is_journalled(cfg, claims):
    """After an incident, the calls that did not run are the interesting ones."""
    with pytest.raises(GatewayDenied):
        _apply(cfg, claims, [FileWrite(".env", "X=1\n")], allowed_globs=["**"],
               idempotency_key="key-refused-01")

    refusals = _events(cfg, claims.run_id, EVENT_REFUSED)
    assert refusals
    assert refusals[-1]["idempotency_key"] == "key-refused-01"
    assert "deny glob" in refusals[-1]["reason"]


def test_gateway_guardrail_results_carry_the_gateway_level(cfg, claims):
    result = _apply(cfg, claims, [FileWrite("app/service.py", "v = 3\n")])
    assert result.guardrails
    for entry in result.guardrails:
        assert entry["guardrail_level"] == "gateway"


# --------------------------------------------------------------------------- #
# The bypass, closed (ADR 0004)
# --------------------------------------------------------------------------- #
def test_a_direct_writing_backend_is_refused_under_mcp_mode(raw_config, tmp_path, monkeypatch):
    """The whole reason the gateway exists.

    A `cli_agent` backend holds its own file handle, so a gateway it never calls
    cannot constrain it. Under `mcp` mode step 12 refuses such a backend rather
    than letting it write unchecked.
    """
    import json as _json

    from codegen_core.core.config import ConfigLoader

    raw_config["gateway"] = {"mode": "mcp"}
    path = tmp_path / "c.json"
    path.write_text(_json.dumps(raw_config))
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    cfg = ConfigLoader.load(path)

    assert cfg.gateway.mode == "mcp"
    # devtool.cursor is the configured backend that writes to disk itself.
    assert cfg.backends["devtool.cursor"].edits_files_directly is True


def test_direct_mode_is_the_default(cfg):
    """Rollout starts where behaviour is unchanged."""
    assert cfg.gateway.mode == "direct"
    assert cfg.gateway.fail_closed is True


def test_apply_patch_is_not_exposed_in_direct_mode(cfg):
    """Two writers is the two-sources-of-truth failure ADR 0004 warns about."""
    import asyncio

    from codegen_core.gateway.server import build_server

    server = build_server(cfg)
    names = {t.name for t in asyncio.run(server.list_tools())}
    assert "repo.apply_patch" not in names
    assert "repo.read_file" in names


def test_apply_patch_appears_once_the_gateway_owns_writes(raw_config, tmp_path, monkeypatch):
    import asyncio
    import json as _json

    from codegen_core.core.config import ConfigLoader
    from codegen_core.gateway.server import build_server

    raw_config["gateway"] = {"mode": "mcp"}
    raw_config["app"]["paths"] = {
        "artifacts": str(tmp_path / "a" / "{job_id}"),
        "runs": str(tmp_path / "r" / "{job_id}"),
        "workspace": str(tmp_path / "w" / "{job_id}"),
        "prompts": str(tmp_path / "p"),
        "schema_registry": str(tmp_path / "s"),
    }
    path = tmp_path / "c.json"
    path.write_text(_json.dumps(raw_config))
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    monkeypatch.setenv("CODEGEN_GATEWAY_SECRET", "z" * 48)

    server = build_server(ConfigLoader.load(path))
    names = {t.name for t in asyncio.run(server.list_tools())}
    assert "repo.apply_patch" in names
