"""Reviewer isolation is enforced against the journal, not by convention."""

import json

import pytest

from codegen_core.core.config import ConfigLoader
from codegen_core.core.context import JobContext
from codegen_core.core.errors import BackendError
from codegen_core.llm.base import Completion
from codegen_core.llm.factory import build_backends
from codegen_core.llm.router import LLMRouter


def _router(cfg, ctx):
    return LLMRouter(cfg, build_backends(cfg), ctx.journal)


def test_step_routes_to_its_configured_capability(cfg, ctx):
    r = _router(cfg, ctx)
    assert r.explain(12)["capability"] == "coding"
    assert r.explain(23)["capability"] == "reasoning"


def test_docker_profile_uses_the_dedicated_phi_reviewer(
    raw_config, tmp_path, monkeypatch
):
    config_path = tmp_path / "config.json"
    config_path.write_text(json.dumps(raw_config))
    monkeypatch.setenv("CODEGEN_PROJECT_PATH", str(tmp_path))
    monkeypatch.setenv(
        "LMSTUDIO_REVIEW_MODEL", "microsoft/phi-4-reasoning-plus"
    )

    cfg = ConfigLoader.load(config_path, profile="docker-lmstudio")

    assert cfg.resolve_backend_id(13) == "local.lmstudio.reviewer"
    assert cfg.resolve_backend_id(23) == "local.lmstudio.reviewer"
    assert (
        cfg.backends["local.lmstudio.reviewer"].model
        == "microsoft/phi-4-reasoning-plus"
    )


def test_reviewer_falls_back_when_it_would_reuse_the_author_model(cfg, ctx):
    r = _router(cfg, ctx)
    author = r.backend_for(12)

    # Record that step 12 actually ran on that model.
    ctx.journal._append(
        {"type": "step", "step": 12, "status": "OK",
         "provenance": {"model_id": author.model_id, "backend_id": author.id}}
    )
    reviewer = r.backend_for(23)
    assert reviewer.model_id != author.model_id


def test_cached_step_without_model_does_not_erase_author_identity(cfg, ctx):
    """Old cached records had null provenance; isolation must keep looking back
    to the model that actually authored the implementation."""
    author = _router(cfg, ctx).backend_for(12)
    ctx.journal._append(
        {"type": "step", "step": 12, "status": "OK",
         "provenance": {"model_id": author.model_id, "backend_id": author.id}}
    )
    ctx.journal._append(
        {"type": "step", "step": 12, "status": "OK",
         "provenance": {"model_id": None, "backend_id": None}}
    )

    r = _router(cfg, ctx)
    assert author.model_id in r.forbidden_models(13)
    assert r.backend_for(13).model_id != author.model_id


def test_without_journal_history_no_fallback_is_forced(cfg, ctx):
    r = _router(cfg, ctx)
    assert r.backend_for(23).id == cfg.routing.defaults["reasoning"]


def test_unknown_driver_is_rejected(cfg):
    from codegen_core.core.errors import ConfigError
    import pytest

    broken = cfg.model_copy(deep=True)
    object.__setattr__(broken.backends["mock.offline"], "driver", "telepathy")
    with pytest.raises(ConfigError, match="unknown driver"):
        build_backends(broken)


def test_a_backend_that_dies_is_retried_before_the_step_is_demoted(cfg, ctx, monkeypatch):
    """A local server killed for memory comes back; a reviewer swap is not the
    right answer to a transient death."""
    from codegen_core.llm import router as router_mod

    monkeypatch.setattr(router_mod, "BACKEND_BACKOFF_S", 0)
    r = _router(cfg, ctx)
    chosen = r.backend_for(2)
    calls = {"n": 0}

    def flaky(system, user, **params):
        calls["n"] += 1
        if calls["n"] < 3:
            raise BackendError("terminated")
        return Completion("{}", 1, 1)

    monkeypatch.setattr(chosen, "complete", flaky)
    completion, used = r.complete(2, "sys", "usr")
    assert calls["n"] == 3
    assert used is chosen  # never demoted to another model


def test_every_backend_failing_is_a_backend_error_not_a_config_error(cfg, ctx, monkeypatch):
    """RetryPolicy only retries BackendError, and a run-time death is not a
    configuration mistake."""
    from codegen_core.llm import router as router_mod

    monkeypatch.setattr(router_mod, "BACKEND_BACKOFF_S", 0)
    r = _router(cfg, ctx)
    for backend in r.backends.values():
        monkeypatch.setattr(
            backend, "complete",
            lambda *a, **k: (_ for _ in ()).throw(BackendError("terminated")),
        )
    with pytest.raises(BackendError, match="every backend failed"):
        r.complete(2, "sys", "usr")


def test_a_failing_reviewer_never_falls_back_to_the_author_model(cfg, ctx, monkeypatch):
    """Isolation constrains the whole chain, not just its head.

    A reviewer step whose backend dies must fail loudly rather than retry on the
    model that wrote the code — that fallback would be recorded as an
    independent review.
    """
    from codegen_core.llm import router as router_mod

    monkeypatch.setattr(router_mod, "BACKEND_BACKOFF_S", 0)
    r = _router(cfg, ctx)
    author = r.backend_for(12)
    ctx.journal._append(
        {"type": "step", "step": 12, "status": "OK",
         "provenance": {"model_id": author.model_id, "backend_id": author.id}}
    )

    reviewer = r.backend_for(23)
    assert reviewer.model_id != author.model_id

    # The reviewer's own backend dies; the author's is healthy and would answer.
    monkeypatch.setattr(
        reviewer, "complete",
        lambda *a, **k: (_ for _ in ()).throw(BackendError("terminated")),
    )
    answered: list[str] = []
    monkeypatch.setattr(
        author, "complete",
        lambda *a, **k: answered.append("author") or Completion("{}", 1, 1),
    )

    with pytest.raises(BackendError, match="every backend failed"):
        r.complete(23, "sys", "usr")
    assert answered == [], "the author's model answered a reviewer step"
