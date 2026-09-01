from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class AcceptanceCriterion(BaseModel):
    """One testable condition of done.

    The id is the join key for the rest of the run: step 07 designs a test
    against it, step 13 checks the code covers it, step 22 lists it in the pull
    request. Nothing enforces the "AC-n" spelling, but everything downstream
    reads better when it holds, so the model is asked for it explicitly.
    """

    id: str = Field(description='a short id of the form "AC-1", numbered from 1')
    text: str = Field(
        description="one testable condition of done, stated so a test can assert it"
    )


class BrdV1(BaseModel):
    """Step 05: the business contract a human signs off at gate 06."""

    title: str
    background: str = ""
    objectives: list[str] = Field(default_factory=list)
    scope_in: list[str] = Field(default_factory=list)
    scope_out: list[str] = Field(default_factory=list)
    acceptance_criteria: list[AcceptanceCriterion] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    assumptions: list[str] = Field(default_factory=list)

    def as_markdown(self) -> str:
        def bullets(items):
            return "\n".join(f"- {i}" for i in items) or "- (none)"

        acs = "\n".join(f"- **{a.id}** {a.text}" for a in self.acceptance_criteria) or "- (none)"
        return (
            f"# Business Requirement Document\n\n## {self.title}\n\n"
            f"### Background\n{self.background}\n\n"
            f"### Objectives\n{bullets(self.objectives)}\n\n"
            f"### In Scope\n{bullets(self.scope_in)}\n\n"
            f"### Out of Scope\n{bullets(self.scope_out)}\n\n"
            f"### Acceptance Criteria\n{acs}\n\n"
            f"### Risks\n{bullets(self.risks)}\n\n"
            f"### Assumptions\n{bullets(self.assumptions)}\n"
        )


class ApprovalRecordV1(BaseModel):
    """Emitted by both gates. artifact_sha256 binds the approval to exact bytes,
    so regenerating the approved document invalidates its own approval."""

    gate: str
    status: str                       # APPROVED | REJECTED | CHANGES_REQUESTED
    approver_id: str
    approver_role: str
    decided_at: datetime
    comment: str = ""
    artifact_sha256: str | None = None
