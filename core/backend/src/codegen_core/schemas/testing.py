from __future__ import annotations

from pydantic import BaseModel, Field


#: What `covers` points at, said once for both designs below.
#:
#: The direction is the whole contract and it is not guessable: asked for a test
#: design with `covers` untyped in meaning, a model produced the matrix pointing
#: the other way — acceptance entries listing the unit tests that covered them,
#: unit entries listing nothing — which is a defensible reading of the word and
#: fails step 07's check completely, because the two id spaces never meet.
_COVERS = (
    "the BRD acceptance-criterion ids this test verifies, e.g. [\"AC-1\", \"AC-3\"]. "
    "Always ids from BrdV1.acceptance_criteria, never the ids of other tests. "
    "Every acceptance-criterion id must appear here on at least one test"
)


class UnitTestDesign(BaseModel):
    id: str = Field(description='this test\'s own id, e.g. "U-1"')
    target: str = Field(description="the module.function under test, e.g. exports.build_csv")
    covers: list[str] = Field(default_factory=list, description=_COVERS)
    given: str = Field(default="", description="the starting state or input for this test")
    expect: str = Field(default="", description="the behaviour asserted, phrased as an outcome")


class AcceptanceScenario(BaseModel):
    id: str = Field(description='this scenario\'s own id, e.g. "S-1"')
    covers: list[str] = Field(default_factory=list, description=_COVERS)
    scenario: str = Field(
        default="", description="the end-to-end scenario, phrased as a user-visible outcome"
    )


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
