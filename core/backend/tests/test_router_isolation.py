"""Reviewer isolation is enforced against the journal, not by convention."""

from codegen_core.core.context import JobContext
from codegen_core.llm.factory import build_backends
from codegen_core.llm.router import LLMRouter


def _router(cfg, ctx):
    return LLMRouter(cfg, build_backends(cfg), ctx.journal)


def test_step_routes_to_its_configured_capability(cfg, ctx):
    r = _router(cfg, ctx)
    assert r.explain(12)["capability"] == "coding"
    assert r.explain(23)["capability"] == "reasoning"


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
