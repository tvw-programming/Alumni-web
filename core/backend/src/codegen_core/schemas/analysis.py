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
    """One thing the ticket does not answer, addressed to a person.

    The descriptions are prompt material, not commentary: they are rendered into
    the field spec the model is given, and they exist because a model asked for
    a `Question` with types alone still has to guess *which* numbering
    `blocks_step` uses, and answered with the name of a concern from its own
    input ("backend") the last time it was left to.
    """

    id: str = Field(description='a short quoted identifier such as "Q1" - a string, not a bare number')
    text: str = Field(description="the question, phrased for a human to answer")
    blocks_step: int | None = Field(
        default=None,
        description=(
            "the pipeline step number from 1 to 24 that cannot proceed until this "
            "is answered, or null if it blocks nothing - never a step name or a "
            "concern such as backend or ui"
        ),
    )


class AmbiguityReportV1(BaseModel):
    """Step 03: what the ticket does NOT say. Never fill these in - ask."""

    gaps: list[str] = Field(default_factory=list)
    contradictions: list[str] = Field(default_factory=list)
    unclear_behaviour: list[str] = Field(default_factory=list)
    unavailable_data: list[str] = Field(default_factory=list)
    edge_cases: list[str] = Field(default_factory=list)
    questions_for_human: list[Question] = Field(default_factory=list)
    blocking: bool = False
