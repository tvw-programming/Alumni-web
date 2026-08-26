"""The story details a developer typed in, rather than the tracker's copy.

A run normally reads its ticket from the tracker configured in config.json. But
a developer starting a run by hand often has the story in front of them and no
wish to round-trip it through Jira first — or is working on something that has
no ticket yet. So step 01 takes an optional hand-written input, and falls back
to the tracker when there isn't one.

The input lives beside the journal, in the run directory, for the same reason
gate decisions do: it is part of what makes the run reproducible, and a process
that resumes hours later in a different container has to be able to read it.

It is *input*, not an artifact. What step 01 writes from it — the canonical
JiraStoryV1, checksummed — is the artifact, and everything downstream traces to
that, whichever source produced it.
"""

from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, field_validator

from .errors import CodeGenCoreError

FILENAME = "story_input.json"


class ManualStoryInput(BaseModel):
    """What the developer was asked for when they started the run."""

    key: str
    title: str
    description: str = ""
    #: Load-bearing, not decorative: step 05 cannot write a BRD without them and
    #: steps 07, 13 and 23 all trace to their ids. A story with none is refused
    #: at the start rather than four steps later.
    acceptance_criteria: list[str] = Field(default_factory=list)
    priority: str = "Medium"
    labels: list[str] = Field(default_factory=list)
    #: Who typed it, for the audit record.
    entered_by: str = ""

    @field_validator("key", "title")
    @classmethod
    def _required(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("must not be empty")
        return value.strip()

    @field_validator("acceptance_criteria")
    @classmethod
    def _criteria(cls, value: list[str]) -> list[str]:
        cleaned = [c.strip() for c in value if c.strip()]
        if not cleaned:
            raise ValueError(
                "at least one acceptance criterion is required: every later step "
                "traces back to their ids, so a story without them cannot be verified"
            )
        return cleaned

    # ------------------------------------------------------------------ #
    def as_story(self) -> dict:
        """The JiraStoryV1-shaped dict step 01 would otherwise have fetched."""
        story = {
            "key": self.key,
            "title": self.title,
            "description": self.description,
            "acceptance_criteria": list(self.acceptance_criteria),
            "priority": self.priority,
            "labels": list(self.labels),
            "components": [],
            "dependencies": [],
            "attachments": [],
            "reporter": self.entered_by or None,
        }
        # Same checksum rule the tracker adapters use, so a story is traceable
        # to its exact source text however it arrived.
        story["source_checksum"] = hashlib.sha256(
            json.dumps(story, sort_keys=True, default=str).encode()
        ).hexdigest()
        return story


def path_for(ctx: Any) -> Path:
    return Path(ctx.journal.root) / FILENAME


def save(ctx: Any, data: dict) -> ManualStoryInput:
    """Validate and persist the developer's input. Raises on anything unusable."""
    try:
        story = ManualStoryInput.model_validate(data)
    except ValueError as exc:
        raise CodeGenCoreError(f"story details are incomplete: {exc}") from exc
    path_for(ctx).write_text(story.model_dump_json(indent=2))
    return story


def load(ctx: Any) -> ManualStoryInput | None:
    """The input for this run, or None where the developer skipped the form."""
    path = path_for(ctx)
    if not path.exists():
        return None
    try:
        return ManualStoryInput.model_validate_json(path.read_text())
    except (OSError, ValueError) as exc:
        # Refusing here beats silently falling through to the tracker: the
        # developer supplied details and would not learn they were ignored.
        raise CodeGenCoreError(f"{path.name} is present but unreadable: {exc}") from exc
