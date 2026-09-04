"""A2A envelope - the transport layer.

Every component receives an Envelope and returns an Envelope. The envelope is
modality agnostic: it carries a list of Parts plus routing and provenance
metadata. correlation_id threads an entire job; trace_id threads one attempt.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field

from .parts import JsonPart, Part
from .provenance import Provenance


class Intent(str, Enum):
    REQUEST = "request"
    RESULT = "result"
    ERROR = "error"
    GATE_WAIT = "gate_wait"
    REVIEW = "review"
    REMEDIATE = "remediate"


class FailureClass(str, Enum):
    """Typed failure category used by remediation routing.

    Stops every machine-recoverable failure from blindly jumping to step 12.
    """

    TEST = "TEST"
    LINT = "LINT"
    AMBIGUITY = "AMBIGUITY"
    CODE = "CODE"
    SECURITY = "SECURITY"
    OTHER = "OTHER"


class RemediationSource(str, Enum):
    """Why step 12 (or another remediator) was entered."""

    FAILURE_CLASS = "FAILURE_CLASS"
    MANUAL = "MANUAL"
    LOOP_BUDGET_EXHAUSTED = "LOOP_BUDGET_EXHAUSTED"


class FailurePayload(BaseModel):
    """Compact prior-failure context injected into the code-fix agent prompt.

    Never carries full envelope blobs — only a one-liner summary plus structured
    finding strings the agent can act on.
    """

    step_id: str
    failure_class: str
    envelope_sha256: str = ""
    summary: str
    findings: list[str] = Field(default_factory=list)


#: Default class for a step when the envelope does not set one.
STEP_FAILURE_CLASS: dict[int, FailureClass] = {
    3: FailureClass.AMBIGUITY,
    7: FailureClass.TEST,
    13: FailureClass.CODE,
    14: FailureClass.LINT,
    15: FailureClass.TEST,
    16: FailureClass.TEST,
    17: FailureClass.CODE,
    18: FailureClass.SECURITY,
    19: FailureClass.SECURITY,
    23: FailureClass.CODE,
    24: FailureClass.CODE,
}


def failure_class_for(step: int, env: "Envelope | None" = None) -> FailureClass:
    if env is not None and env.failure_class is not None:
        return env.failure_class
    return STEP_FAILURE_CLASS.get(step, FailureClass.OTHER)


class ComponentRef(BaseModel):
    step: int | None = None
    name: str
    kind: str
    version: str = "1.0.0"

    def __str__(self) -> str:  # pragma: no cover - display only
        n = f"{self.step:02d}:" if self.step is not None else ""
        return f"{n}{self.name}({self.kind})"


def new_id(prefix: str = "msg") -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Envelope(BaseModel):
    protocol: Literal["a2a/1.0"] = "a2a/1.0"
    message_id: str = Field(default_factory=lambda: new_id())
    correlation_id: str
    trace_id: str = Field(default_factory=lambda: new_id("trace"))
    sender: ComponentRef
    recipient: ComponentRef
    intent: Intent = Intent.REQUEST
    status: str = "OK"
    accepts: list[str] = Field(default_factory=lambda: ["*/*"])
    parts: list[Part] = Field(default_factory=list)
    provenance: Provenance = Field(default_factory=Provenance)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    #: Set on failed replies so the runner can route by class, not only by status.
    failure_class: FailureClass | None = None
    #: Dashboard / UI: why remediation entered this step (step 12 contract).
    remediation_source: RemediationSource | str | None = None
    #: How many times step 12 has been entered this run (code-fix loop).
    loop_count: int | None = None
    #: Max code-fix loops from `pipeline.loop_budget` (default 3).
    loop_budget: int | None = None
    #: Last few prior failures (never full envelopes) for prompt injection.
    prior_failures: list[FailurePayload] = Field(default_factory=list)

    # ------------------------------------------------------------------ #
    @property
    def failed(self) -> bool:
        return self.intent is Intent.ERROR or self.status not in ("OK", "APPROVED", "PASSED")

    def json_part(self, schema_id: str) -> dict[str, Any]:
        """Fetch structured data by schema id. Raises if the producer never sent it."""
        for p in self.parts:
            if isinstance(p, JsonPart) and p.schema_id == schema_id:
                return p.data
        raise KeyError(f"{schema_id} not present in envelope {self.message_id}")

    def maybe_json_part(self, schema_id: str) -> dict[str, Any] | None:
        try:
            return self.json_part(schema_id)
        except KeyError:
            return None

    def schema_ids(self) -> list[str]:
        return [p.schema_id for p in self.parts if isinstance(p, JsonPart)]

    def reply(
        self,
        sender: ComponentRef,
        parts: list[Part],
        *,
        intent: Intent = Intent.RESULT,
        status: str = "OK",
        provenance: Provenance | None = None,
        failure_class: FailureClass | None = None,
        remediation_source: RemediationSource | str | None = None,
        loop_count: int | None = None,
        loop_budget: int | None = None,
        prior_failures: list[FailurePayload] | None = None,
    ) -> "Envelope":
        return Envelope(
            correlation_id=self.correlation_id,
            trace_id=self.trace_id,
            sender=sender,
            recipient=self.sender,
            intent=intent,
            status=status,
            parts=parts,
            failure_class=failure_class,
            remediation_source=remediation_source if remediation_source is not None else self.remediation_source,
            loop_count=loop_count if loop_count is not None else self.loop_count,
            loop_budget=loop_budget if loop_budget is not None else self.loop_budget,
            prior_failures=list(prior_failures) if prior_failures is not None else list(self.prior_failures),
            provenance=(provenance or Provenance()).model_copy(
                update={"parent_message_ids": [self.message_id]}
            ),
        )
