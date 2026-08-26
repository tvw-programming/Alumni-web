from __future__ import annotations

from pydantic import BaseModel, Field


class StoryAnalysisV1(BaseModel):
    """Step 02: the story split by concern, so later steps reason one axis at a time."""

    ui: list[str] = Field(default_factory=list)
    backend: list[str] = Field(default_factory=list)
    database: list[str] = Field(default_factory=list)
    security: list[str] = Field(default_factory=list)
    integration: list[str] = Field(default_factory=list)
    non_functional: list[str] = Field(default_factory=list)


class Question(BaseModel):
    id: str
    text: str
    blocks_step: int | None = None


class AmbiguityReportV1(BaseModel):
    """Step 03: what the ticket does NOT say. Never fill these in - ask."""

    gaps: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    unclear_behaviour: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)
    edge_cases: list[str] = Field(default_factory=list)
    questions_for_human: list[Question] = Field(default_factory=list)
    blocking: bool = False
