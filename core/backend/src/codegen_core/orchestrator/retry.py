"""Retry with backoff, per step, from config.steps.NN.retry."""

from __future__ import annotations

import time
from typing import Any, Callable

from pydantic import ValidationError

from ..core.errors import BackendError, PolicyViolation
from ..core.telemetry import log

#: Never retry these - retrying a policy violation just violates policy again.
FATAL = (PolicyViolation,)

#: Worth another attempt.
#:
#: BackendError and TimeoutError are the transport failing. ValidationError is
#: the model failing: it answered, and the answer did not fit the schema - a
#: field typed as a string where the schema wants a list, most often, from a
#: small local model. That is a resampling problem, not a fatal one, and the
#: attempt costs one more call to a model that is already loaded. Left out of
#: this tuple it was not merely unretried but uncaught, since a pydantic
#: ValidationError is a ValueError rather than a CodeGenCoreError.
RETRIABLE = (BackendError, TimeoutError, ValidationError)


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
            except RETRIABLE as exc:
                last = exc
                log.warning(
                    "step attempt failed",
                    extra={
                        "extra_fields": {
                            "step": step,
                            "attempt": attempt,
                            "error_type": type(exc).__name__,
                            # A ValidationError's own str() runs to several
                            # lines; flattened, it still names the bad field,
                            # which is the part worth having in a log line.
                            "error": " ".join(str(exc).split())[:300],
                        }
                    },
                )
                if attempt < rcfg.max_attempts:
                    time.sleep(rcfg.backoff_s * attempt)
        raise last  # type: ignore[misc]
