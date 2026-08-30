"""Tracing must be inert when off, and must never invent its own numbers.

The second property is the important one. Token totals exported to a dashboard
and token totals summed from the journal have to agree, and the only way to
guarantee that is for both to read the same Provenance.
"""

import json

import pytest

from codegen_core.core.provenance import Provenance
from codegen_core.core.tracing import (
    COST_USD,
    GEN_AI_INPUT_TOKENS,
    GEN_AI_OUTPUT_TOKENS,
    PROMPT_SHA,
    Tracing,
)


def test_disabled_by_default(cfg):
    """The docker profiles ship with trace_sink.enabled false."""
    assert Tracing(cfg).enabled is False


def test_spans_are_no_ops_when_disabled(cfg):
    """A run with tracing off must behave identically, not crash on a None span."""
    tracing = Tracing(cfg)
    with tracing.run_span("DEEP-1") as span:
        span.set_attribute("anything", 1)
        with tracing.step_span(12, "code_update", "agent", "critical") as inner:
            inner.set_attribute("also", "fine")
        with tracing.guardrail_span("pipeline", "action_intent") as g:
            g.set_status("ok")
    tracing.record_generation(span, Provenance())


def test_enabling_without_the_sdk_or_endpoint_stays_inert(raw_config, tmp_path, monkeypatch):
    """A misconfiguration degrades to no tracing, never to a failed run."""
    from codegen_core.core.config import ConfigLoader

    raw_config["observability"]["trace_sink"] = {
        "driver": "otlp",
        "endpoint_env": "CODEGEN_TEST_OTEL_UNSET",
        "enabled": True,
    }
    path = tmp_path / "c.json"
    path.write_text(json.dumps(raw_config))
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    monkeypatch.delenv("CODEGEN_TEST_OTEL_UNSET", raising=False)

    assert Tracing(ConfigLoader.load(path)).enabled is False


class _RecordingSpan:
    def __init__(self) -> None:
        self.attributes: dict[str, object] = {}

    def set_attribute(self, key: str, value: object) -> None:
        self.attributes[key] = value


def test_generation_attributes_come_from_provenance(cfg, monkeypatch):
    """Exported, not measured — the span carries exactly what Provenance holds."""
    tracing = Tracing(cfg)
    monkeypatch.setattr(tracing, "enabled", True)

    provenance = Provenance(
        backend_id="local.lmstudio.qwen35",
        model_id="qwen/qwen3.5-9b",
        prompt_sha256="abc123",
    ).with_usage(1200, 340, {"input": 0.001, "output": 0.002})

    span = _RecordingSpan()
    tracing.record_generation(span, provenance)

    assert span.attributes[GEN_AI_INPUT_TOKENS] == 1200
    assert span.attributes[GEN_AI_OUTPUT_TOKENS] == 340
    assert span.attributes[COST_USD] == provenance.cost_usd
    assert span.attributes[PROMPT_SHA] == "abc123"


def test_span_cost_reconciles_with_the_journal(cfg, ctx, monkeypatch):
    """Two counters that disagree are worse than one.

    Sums what the spans would export and compares it against the journal's own
    total for the same envelopes.
    """
    from codegen_core.core.envelope import ComponentRef, Envelope, Intent

    tracing = Tracing(cfg)
    monkeypatch.setattr(tracing, "enabled", True)

    exported = 0.0
    for step, (tin, tout) in enumerate([(100, 50), (2400, 610), (75, 12)], start=2):
        provenance = Provenance(model_id="m").with_usage(
            tin, tout, {"input": 0.003, "output": 0.015}
        )
        ref = ComponentRef(step=step, name=f"step_{step}", kind="AGENT")
        env_in = Envelope(correlation_id="c", sender=ref, recipient=ref)
        env_out = Envelope(
            correlation_id="c",
            sender=ref,
            recipient=ref,
            intent=Intent.RESULT,
            provenance=provenance,
        )
        ctx.journal.append(env_in, env_out)

        span = _RecordingSpan()
        tracing.record_generation(span, provenance)
        exported += float(span.attributes[COST_USD])

    # The two apply rounding at different points, deliberately: Provenance
    # rounds each step to 6dp as it records, and journal.total_cost_usd() rounds
    # the sum to 4dp for reporting. The invariant is that they agree at the
    # precision the journal publishes — sum-of-rounded and rounded-sum differ in
    # the 6th decimal, and asserting exact equality would be asserting a bug.
    assert round(exported, 4) == ctx.journal.total_cost_usd()


def test_no_prompt_or_source_reaches_a_span(cfg, monkeypatch):
    """Only the hash travels. The text stays in the artifact store."""
    tracing = Tracing(cfg)
    monkeypatch.setattr(tracing, "enabled", True)

    secret = "api_key = 'sk-live-should-never-be-exported'"
    provenance = Provenance(
        model_id="m", prompt_sha256=Provenance.hash_prompt(secret)
    ).with_usage(10, 5, {})

    span = _RecordingSpan()
    tracing.record_generation(span, provenance)

    for value in span.attributes.values():
        assert "sk-live" not in str(value)
    assert span.attributes[PROMPT_SHA] == Provenance.hash_prompt(secret)


def test_intent_span_carries_shape_not_prose(cfg, monkeypatch):
    """justification can quote source; it belongs in the journal, not a span."""
    tracing = Tracing(cfg)
    monkeypatch.setattr(tracing, "enabled", True)

    span = _RecordingSpan()
    tracing.record_intent(
        span,
        {
            "action": "apply_patch",
            "target_files": ["src/auth/session.py", "tests/test_session.py"],
            "risk_level": "critical",
            "justification": "Change src/auth/session.py because SECRET_TOKEN rotates.",
        },
    )

    assert span.attributes["codegen.action.file_count"] == 2
    for value in span.attributes.values():
        assert "SECRET_TOKEN" not in str(value)
