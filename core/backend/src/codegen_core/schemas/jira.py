from __future__ import annotations

from pydantic import BaseModel, Field


class Attachment(BaseModel):
    filename: str
    mime_type: str
    uri: str | None = None


class JiraStoryV1(BaseModel):
    """Canonical form of the source ticket. Everything downstream traces to this."""

    key: str
    title: str
    description: str = ""
    acceptance_criteria: list[str] = Field(default_factory=list)
    priority: str = "Medium"
    labels: list[str] = Field(default_factory=list)
    components: list[str] = Field(default_factory=list)
    dependencies: list[str] = Field(default_factory=list)
    attachments: list[Attachment] = Field(default_factory=list)
    reporter: str | None = None
    source_checksum: str | None = None
