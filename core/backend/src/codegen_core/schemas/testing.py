from __future__ import annotations

from pydantic import BaseModel, Field


class UnitTestDesign(BaseModel):
    id: str
    target: str
    covers: list[str] = Field(default_factory=list)   # acceptance criteria ids
    given: str = ""
    expect: str = ""


class AcceptanceScenario(BaseModel):
    id: str
    covers: list[str] = Field(default_factory=list)
    scenario: str = ""


class TestDesignV1(BaseModel):
    """Step 07: tests designed BEFORE code exists, from the approved BRD."""

    unit: list[UnitTestDesign] = Field(default_factory=list)
    acceptance: list[AcceptanceScenario] = Field(default_factory=list)


class TestReportV1(BaseModel):
    """Steps 16/17: execution results."""

    passed: int = 0
    failed: int = 0
    skipped: int = 0
    duration_s: float = 0.0
    failures: list[dict] = Field(default_factory=list)
    screenshots: list[str] = Field(default_factory=list)

    @property
    def ok(self) -> bool:
        return self.failed == 0


class CoverageV1(BaseModel):
    line_pct: float = 0.0
    changed_line_pct: float = 0.0
    uncovered_files: list[str] = Field(default_factory=list)
