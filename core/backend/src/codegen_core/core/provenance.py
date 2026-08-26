"""Provenance - who produced this, with which model, at what cost.

Attached to every envelope so any artifact can be traced back to the exact
model version and prompt that produced it.
"""

from __future__ import annotations

import hashlib
from datetime import UTC, datetime

from pydantic import BaseModel, Field


class Provenance(BaseModel):
    backend_id: str | None = None
    model_id: str | None = None
    prompt_sha256: str | None = None
    tokens_in: int = 0
    tokens_out: int = 0
    cost_usd: float = 0.0
    parent_message_ids: list[str] = Field(default_factory=list)
    component_version: str = "1.0.0"
    produced_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @staticmethod
    def hash_prompt(prompt: str) -> str:
        return hashlib.sha256(prompt.encode()).hexdigest()

    def with_usage(self, tokens_in: int, tokens_out: int, cost_per_1k: dict) -> "Provenance":
        cost = (tokens_in / 1000) * cost_per_1k.get("input", 0.0) + (
            tokens_out / 1000
        ) * cost_per_1k.get("output", 0.0)
        return self.model_copy(
            update={"tokens_in": tokens_in, "tokens_out": tokens_out, "cost_usd": round(cost, 6)}
        )
