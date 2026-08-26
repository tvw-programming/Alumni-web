from __future__ import annotations

from pydantic import BaseModel, Field


class RequirementCoverageV1(BaseModel):
    """Step 13: does every code change trace to an acceptance criterion, and does
    every acceptance criterion have code? Catches both drift and hallucination."""

    covered: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    unrelated_changes: list[str] = Field(default_factory=list)
    hallucinated_functionality: list[str] = Field(default_factory=list)
    verdict: str = "PASSED"          # PASSED | FAILED


class AiReviewV1(BaseModel):
    """Step 23: independent review by a model that did NOT write the code."""

    requirement_compliance: str = "PASSED"
    bugs: list[str] = Field(default_factory=list)
    regression_risk: str = "low"
    security: list[str] = Field(default_factory=list)
    performance: list[str] = Field(default_factory=list)
    architecture: list[str] = Field(default_factory=list)
    maintainability: list[str] = Field(default_factory=list)
    test_quality: list[str] = Field(default_factory=list)
    verdict: str = "APPROVED"        # APPROVED | CHANGES_REQUESTED
    reviewer_model_id: str | None = None
