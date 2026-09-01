from __future__ import annotations

from pydantic import BaseModel, Field


class ProjectContextV1(BaseModel):
    """Step 04: project-level conventions an implementer must respect."""

    architecture: str = ""
    frameworks: list[str] = Field(default_factory=list)
    conventions: list[str] = Field(default_factory=list)
    folder_structure: list[str] = Field(default_factory=list)
    reusable_components: list[str] = Field(default_factory=list)
    api_conventions: list[str] = Field(default_factory=list)
    db_conventions: list[str] = Field(default_factory=list)


class RepoUnderstandingV1(BaseModel):
    """Step 08: what the codebase actually looks like today."""

    modules: list[str] = Field(default_factory=list)
    entry_points: list[str] = Field(default_factory=list)
    ci_jobs: list[str] = Field(default_factory=list)
    integration_touchpoints: list[str] = Field(default_factory=list)
    related_implementations: list[str] = Field(default_factory=list)
    dependency_graph: dict[str, list[str]] = Field(default_factory=dict)


class ApiContract(BaseModel):
    """One endpoint step 12 has to build to."""

    method: str = Field(description="HTTP method in upper case, e.g. GET, POST")
    path: str = Field(description='route path beginning with "/", e.g. /admin/export')
    returns: str = Field(
        default="", description="the success response: status code and body shape"
    )
    auth: str = Field(
        default="", description="who may call this, e.g. the role required, or none"
    )


class FeatureSpecV1(BaseModel):
    """Step 10: the technical contract for THIS ticket only."""

    summary: str = ""
    api_contracts: list[ApiContract] = Field(default_factory=list)
    data_model: list[str] = Field(default_factory=list)
    validation: list[str] = Field(default_factory=list)
    errors: list[dict] = Field(default_factory=list)
    ui_states: list[str] = Field(default_factory=list)
    state_management: list[str] = Field(default_factory=list)
    accessibility: list[str] = Field(default_factory=list)
    security: list[str] = Field(default_factory=list)
    acceptance_criteria: list[str] = Field(default_factory=list)
    implementation_boundaries: list[str] = Field(default_factory=list)

    def as_change_instruction(self) -> str:
        lines = [f"# Implement: {self.summary}", ""]
        if self.api_contracts:
            lines.append("## API contracts")
            lines += [f"- {c.method} {c.path} -> {c.returns}" for c in self.api_contracts]
        for label, items in (
            ("Validation", self.validation), ("Security", self.security),
            ("Acceptance criteria", self.acceptance_criteria),
            ("Boundaries - do not go beyond these", self.implementation_boundaries),
        ):
            if items:
                lines += ["", f"## {label}"] + [f"- {i}" for i in items]
        return "\n".join(lines)
