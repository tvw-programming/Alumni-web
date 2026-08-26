"""Retry with backoff, per step, from config.steps.NN.retry."""

from __future__ import annotations

import time
from typing import Any, Callable

from ..core.errors import BackendError, PolicyViolation
from ..core.telemetry import log

#: Never retry these - retrying a policy violation just violates policy again.
FATAL = (PolicyViolation,)


class RetryPolicy:
    def __init__(self, cfg: Any) -> None:
        self.cfg = cfg

    def call(self, fn: Callable, step: int, *args: Any, **kw: Any) -> Any:
        rcfg = self.cfg.step_cfg(step).retry
        last: Exception | None = None
        for attempt in range(1, rcfg.max_attempts + 1):
            try:
                return fn(*args, **kw)
            except FATAL:
                raise
            except (BackendError, TimeoutError) as exc:
                last = exc
                log.warning(
                    "step attempt failed",
                    extra={"extra_fields": {"step": step, "attempt": attempt, "error": str(exc)}},
                )
                if attempt < rcfg.max_attempts:
                    time.sleep(rcfg.backoff_s * attempt)
        raise last  # type: ignore[misc]
