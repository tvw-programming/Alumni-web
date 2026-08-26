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
    ) -> "Envelope":
        return Envelope(
            correlation_id=self.correlation_id,
            trace_id=self.trace_id,
            sender=sender,
            recipient=self.sender,
            intent=intent,
            status=status,
            parts=parts,
            provenance=(provenance or Provenance()).model_copy(
                update={"parent_message_ids": [self.message_id]}
            ),
        )
