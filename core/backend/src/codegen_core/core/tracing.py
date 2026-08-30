"""OpenTelemetry spans for the pipeline.

`config.observability.trace_sink` has declared an OTLP endpoint since the config
was written and nothing read it. This module is what reads it.

Three rules shape the implementation:

**Optional, like every other integration here.** If `opentelemetry` is not
installed, or the sink is disabled, every call becomes a no-op context manager.
The pipeline must run identically with tracing off — that is what makes it safe
to leave off in the docker profile.

**The numbers already exist.** `Provenance` has carried `tokens_in`,
`tokens_out` and `cost_usd` since the beginning, and `journal.total_cost_usd()`
sums them. Spans export *those* values rather than measuring their own, so the
trace and the journal cannot disagree. Two token counters that disagree are
worse than one.

**Redaction is not optional.** No prompt, no diff, no source, no secret goes
into a span attribute — only hashes, ids and counts. `Provenance` already stores
`prompt_sha256` for exactly this reason.
"""

from __future__ import annotations

from contextlib import contextmanager
from typing import Any, Iterator

# Attribute names from the OpenTelemetry GenAI semantic conventions. Pinned here
# rather than imported so an SDK upgrade cannot silently rename a dashboard's
# axis; a deliberate bump is a one-line diff someone reviews.
GEN_AI_SYSTEM = "gen_ai.system"
GEN_AI_REQUEST_MODEL = "gen_ai.request.model"
GEN_AI_OPERATION = "gen_ai.operation.name"
GEN_AI_INPUT_TOKENS = "gen_ai.usage.input_tokens"
GEN_AI_OUTPUT_TOKENS = "gen_ai.usage.output_tokens"

# Workflow attributes are ours; they carry the `codegen.` prefix so they cannot
# collide with a future convention of the same name.
RUN_ID = "codegen.run.id"
STEP_NUMBER = "codegen.step.number"
STEP_NAME = "codegen.step.name"
STEP_KIND = "codegen.step.kind"
STEP_STATUS = "codegen.step.status"
STEP_RISK = "codegen.step.risk_level"
COST_USD = "codegen.cost.usd"
PROMPT_SHA = "codegen.prompt.sha256"
GUARDRAIL_LEVEL = "codegen.guardrail.level"
GUARDRAIL_NAME = "codegen.guardrail.name"
GUARDRAIL_RESULT = "codegen.guardrail.result"
ACTION_KIND = "codegen.action.kind"
ACTION_FILE_COUNT = "codegen.action.file_count"


class _NoSpan:
    """Stands in for a span when tracing is off. Every method is a no-op."""

    def set_attribute(self, *_: Any, **__: Any) -> None: ...
    def set_status(self, *_: Any, **__: Any) -> None: ...
    def record_exception(self, *_: Any, **__: Any) -> None: ...
    def add_event(self, *_: Any, **__: Any) -> None: ...


class Tracing:
    """Span factory. Inert unless the SDK is present and the sink is enabled."""

    def __init__(self, cfg: Any) -> None:
        self.enabled = False
        self._tracer: Any = None

        sink = getattr(cfg.observability, "trace_sink", None)
        if not sink or not getattr(sink, "enabled", False):
            return

        try:
            from opentelemetry import trace
            from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
                OTLPSpanExporter,
            )
            from opentelemetry.sdk.resources import Resource
            from opentelemetry.sdk.trace import TracerProvider
            from opentelemetry.sdk.trace.export import BatchSpanProcessor
        except ImportError:
            # Declared but unavailable is a configuration mistake worth seeing,
            # not a reason to fail a run.
            from .telemetry import log

            log.warning(
                "tracing enabled in config but opentelemetry is not installed; "
                "install codegen_core[tracing]"
            )
            return

        import os

        endpoint = os.getenv(getattr(sink, "endpoint_env", "OTEL_ENDPOINT") or "OTEL_ENDPOINT")
        if not endpoint:
            from .telemetry import log

            log.warning("tracing enabled but %s is unset", getattr(sink, "endpoint_env", ""))
            return

        provider = TracerProvider(
            resource=Resource.create({"service.name": "codegen-core"})
        )
        provider.add_span_processor(
            BatchSpanProcessor(OTLPSpanExporter(endpoint=endpoint))
        )
        trace.set_tracer_provider(provider)
        self._tracer = trace.get_tracer("codegen_core")
        self.enabled = True

    # ------------------------------------------------------------------ #
    @contextmanager
    def span(self, name: str, **attributes: Any) -> Iterator[Any]:
        if not self.enabled:
            yield _NoSpan()
            return

        with self._tracer.start_as_current_span(name) as span:
            for key, value in attributes.items():
                if value is not None:
                    span.set_attribute(key, value)
            try:
                yield span
            except Exception as exc:  # noqa: BLE001 - re-raised after recording
                span.record_exception(exc)
                raise

    def run_span(self, job_id: str):
        return self.span("workflow.run", **{RUN_ID: job_id})

    def step_span(self, step: int, name: str, kind: str, risk: str = "low"):
        # Zero-padded so a trace search for "workflow.step.07" matches, and so
        # the spans sort in step order rather than lexically as 1, 10, 11, 2.
        return self.span(
            f"workflow.step.{step:02d}",
            **{STEP_NUMBER: step, STEP_NAME: name, STEP_KIND: kind, STEP_RISK: risk},
        )

    def guardrail_span(self, level: str, rule: str):
        """One span per check, with the level recorded separately.

        A single "validation passed" flag hides which layer checked. `level` is
        "pipeline" here and "gateway" once the MCP server exists (ADR 0004).
        """
        return self.span(
            f"guardrail.{level}.{rule}",
            **{GUARDRAIL_LEVEL: level, GUARDRAIL_NAME: rule},
        )

    # ------------------------------------------------------------------ #
    def record_generation(self, span: Any, provenance: Any) -> None:
        """Export token and cost from Provenance — never re-measured here.

        The prompt itself never leaves the process; `prompt_sha256` is the
        handle, and the full text lives in the artifact store where access is
        controlled.
        """
        if not self.enabled or provenance is None:
            return

        span.set_attribute(GEN_AI_OPERATION, "chat")
        if provenance.backend_id:
            span.set_attribute(GEN_AI_SYSTEM, provenance.backend_id)
        if provenance.model_id:
            span.set_attribute(GEN_AI_REQUEST_MODEL, provenance.model_id)
        span.set_attribute(GEN_AI_INPUT_TOKENS, provenance.tokens_in)
        span.set_attribute(GEN_AI_OUTPUT_TOKENS, provenance.tokens_out)
        span.set_attribute(COST_USD, provenance.cost_usd)
        if provenance.prompt_sha256:
            span.set_attribute(PROMPT_SHA, provenance.prompt_sha256)

    def record_intent(self, span: Any, intent: Any) -> None:
        """The action's shape, not its prose.

        `justification` is deliberately absent: it can quote source, and a span
        attribute is the wrong place for that. The journal holds the text.
        """
        if not self.enabled or intent is None:
            return
        span.set_attribute(ACTION_KIND, intent.get("action", "unknown"))
        span.set_attribute(ACTION_FILE_COUNT, len(intent.get("target_files", [])))
        span.set_attribute(STEP_RISK, intent.get("risk_level", "low"))
