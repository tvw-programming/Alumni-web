from __future__ import annotations

from pydantic import BaseModel, Field


class ImpactManifestV1(BaseModel):
    """Step 09: the write whitelist. This is the single most safety-critical
    artifact in the pipeline - the code agent may not touch anything outside it."""

    files_to_modify: list[str] = Field(default_factory=list)
    files_to_create: list[str] = Field(default_factory=list)
    allowed_paths: list[str] = Field(default_factory=list)
    loc_budget: int = 300
    impacted_components: list[str] = Field(default_factory=list)
    apis: list[str] = Field(default_factory=list)
    db_entities: list[str] = Field(default_factory=list)
    config_changes: list[str] = Field(default_factory=list)
    tests: list[str] = Field(default_factory=list)
    docs: list[str] = Field(default_factory=list)


class OrderedChange(BaseModel):
    """One edit in the plan step 12 works through.

    `layer` is a closed vocabulary and step 11 sorts on it. A value outside the
    list does not fail — it sorts to the end — so a model inventing "frontend"
    for "ui" quietly reorders the build instead of stopping it. That silence is
    why the permitted values are stated here rather than left to a comment.
    """

    seq: int = Field(description="1-based position in the build order")
    layer: str = Field(
        description=(
            "exactly one of: schema, migration, repository, service, api, ui, tests, docs"
        )
    )
    file: str = Field(description="repository-relative path of the file to change")
    action: str = Field(description="exactly one of: create, modify, delete")
    rationale: str = Field(default="", description="why this change is needed")


class ChangePlanV1(BaseModel):
    """Step 11: the order of edits. Stops an agent editing files at random."""

    ordered_changes: list[OrderedChange] = Field(default_factory=list)


class CodeChangesetV1(BaseModel):
    """Step 12: what actually changed on disk."""

    changed_files: list[str] = Field(default_factory=list)
    created_files: list[str] = Field(default_factory=list)
    changed_loc: int = 0
    commits: list[str] = Field(default_factory=list)
    unified_diff: str = ""
