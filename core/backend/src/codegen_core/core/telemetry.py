"""Structured logging and per-step metrics."""

from __future__ import annotations

import json
import logging
import sys
import time
from contextlib import contextmanager
from typing import Any


def configure(cfg: Any) -> None:
    level = getattr(logging, cfg.observability.log_level.upper(), logging.INFO)
    handler = logging.StreamHandler(sys.stderr)
    if cfg.observability.log_format == "json":
        handler.setFormatter(_JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)-7s %(name)s %(message)s"))
    root = logging.getLogger("codegen_core")
    root.handlers = [handler]
    root.setLevel(level)


class _JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        payload.update(getattr(record, "extra_fields", {}))
        return json.dumps(payload, default=str)


log = logging.getLogger("codegen_core")


class Telemetry:
    def __init__(self, cfg: Any, journal: Any) -> None:
        self.cfg = cfg
        self.journal = journal
        # Inert unless observability.trace_sink is enabled and the SDK is
        # installed; see core/tracing.py.
        from .tracing import Tracing

        self.tracing = Tracing(cfg)

    @contextmanager
    def step_timer(self, step: int, name: str, kind: str = "agent", risk: str = "low"):
        start = time.monotonic()
        log.info("step start", extra={"extra_fields": {"step": step, "component": name}})
        try:
            with self.tracing.step_span(step, name, kind, risk):
                yield
        finally:
            elapsed = round(time.monotonic() - start, 3)
            log.info("step end", extra={"extra_fields": {"step": step, "latency_s": elapsed}})

    def emit(self, step: int, env: Any) -> None:
        fields = {
            "step": step,
            "status": env.status,
            "tokens_in": env.provenance.tokens_in,
            "tokens_out": env.provenance.tokens_out,
            "cost_usd": env.provenance.cost_usd,
            "model": env.provenance.model_id,
        }
        wanted = self.cfg.observability.emit_per_step or list(fields)
        log.info("step metrics", extra={"extra_fields": {k: v for k, v in fields.items() if k in wanted or k == "step"}})

        # Same values, exported rather than re-measured: the span and
        # journal.total_cost_usd() read from one Provenance.
        if self.tracing.enabled:
            from opentelemetry import trace

            span = trace.get_current_span()
            self.tracing.record_generation(span, env.provenance)
