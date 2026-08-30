"""Why a step did what it did.

Provenance answers "which model produced this artifact". It has never answered
"why this file". `ActionIntentV1` is that second answer, and it is required
before a step is allowed to mutate the project.

The point is not the field. A required free-text box fills with "Fix the issue"
unless something checks it, so the specificity rules in `validate_intent` are
the feature — the schema is only what makes them checkable.

Schemas are append-only (CLAUDE.md). This ships as V1 and is never edited in
place; a changed contract becomes V2 alongside it.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel, Field

#: What a step may do. Mirrors `config.steps.NN.allowed_actions`; a step
#: declaring none may only read.
ActionKind = Literal[
    "read",
    "create_artifact",
    "apply_patch",
    "run_test",
    "run_scan",
    "publish",
    "approve",
]

#: Actions that change something outside this process. These are the ones a
#: justification is mandatory for, and the ones the gateway will own (ADR 0004).
MUTATING_ACTIONS: frozenset[str] = frozenset({"apply_patch", "publish"})

RiskLevel = Literal["low", "medium", "high", "critical"]


class ActionIntentV1(BaseModel):
    """One declared action, with the reasoning that justifies it."""

    step: int = Field(ge=1, le=24)
    agent: str = Field(min_length=1, max_length=64)
    action: ActionKind

    #: Operational reasoning: what is changing, why this step requires it, and
    #: what bounds it. Not a request for hidden chain-of-thought — this is the
    #: sentence a reviewer reads in the audit trail six months later.
    justification: str = Field(min_length=40, max_length=1500)

    #: Repository-relative. Empty is valid only for non-mutating actions.
    target_files: list[str] = Field(default_factory=list, max_length=200)

    expected_outcome: str = Field(min_length=10, max_length=1000)

    #: How the claim will be checked. At least one entry, and for a mutation it
    #: has to name something real — see `validate_intent`.
    validation_plan: list[str] = Field(default_factory=list, max_length=20)

    risk_level: RiskLevel = "low"
    requires_human_approval: bool = False


class IntentViolation(Exception):
    """Raised when an action's stated reasoning does not survive inspection."""


#: Phrases that pass a min-length check while saying nothing. Matched whole-word
#: against the whole justification, so "fix the issue" is refused and "fix the
#: issue where the session cookie is not rotated on re-auth" is not.
_GENERIC = re.compile(
    r"^(?:"
    r"fix(?:ed|ing)?(?: the| this)?(?: issue| bug| problem| error)?"
    r"|update(?:d|s)?(?: the| this)?(?: code| file| files)?"
    r"|implement(?:ed|s)?(?: the| this)?(?: feature| change)?"
    r"|as (?:requested|required|needed|per the (?:story|ticket|spec))"
    r"|make(?:s)? (?:it|the code) work"
    r"|refactor(?:ed|ing)?"
    r"|per the (?:plan|spec|requirements?)"
    r")[\s.!]*$",
    re.IGNORECASE,
)

#: A validation plan for a mutation must name a check that exists, not "test it".
_REAL_CHECK = re.compile(
    r"\b(?:pytest|test_|tests?/|unit test|integration test|coverage|"
    r"ruff|mypy|lint|typecheck|semgrep|bandit|gitleaks|trivy|sast|"
    r"scan|step\s*\d{1,2})\b",
    re.IGNORECASE,
)


def validate_intent(intent: ActionIntentV1) -> ActionIntentV1:
    """Reject reasoning that is present but empty of content.

    Raises `IntentViolation` rather than returning a verdict: a mutation whose
    justification does not survive this check must not proceed, and a boolean
    return invites a caller that forgets to read it.
    """
    mutating = intent.action in MUTATING_ACTIONS

    justification = intent.justification.strip()
    if _GENERIC.match(justification):
        raise IntentViolation(
            f"step {intent.step:02d}: justification is generic "
            f"({justification[:60]!r}). Say what is changing and why this step needs it."
        )

    # A justification that never names a file it is about is usually about
    # nothing in particular.
    if mutating and intent.target_files and not any(
        _mentions(justification, path) for path in intent.target_files
    ):
        raise IntentViolation(
            f"step {intent.step:02d}: justification does not mention any of the "
            f"files it changes ({', '.join(intent.target_files[:3])})."
        )

    if mutating and not intent.target_files:
        raise IntentViolation(
            f"step {intent.step:02d}: a {intent.action} must declare the files it touches."
        )

    if mutating and not intent.validation_plan:
        raise IntentViolation(
            f"step {intent.step:02d}: a {intent.action} must state how it will be verified."
        )

    if mutating and not any(_REAL_CHECK.search(entry) for entry in intent.validation_plan):
        raise IntentViolation(
            f"step {intent.step:02d}: the validation plan names no concrete check. "
            f"Reference a test path, a scanner, or a pipeline step."
        )

    if intent.risk_level in ("high", "critical") and not intent.requires_human_approval:
        # Not a hard failure elsewhere in the pipeline — the two mandatory gates
        # already stand — but a step that calls itself critical and waves itself
        # through is contradicting its own assessment.
        raise IntentViolation(
            f"step {intent.step:02d}: risk_level {intent.risk_level!r} requires "
            f"requires_human_approval to be true."
        )

    return intent


def _mentions(justification: str, path: str) -> bool:
    """True when the text refers to the file, by full path or by basename."""
    lowered = justification.lower()
    if path.lower() in lowered:
        return True
    stem = path.rsplit("/", 1)[-1].lower()
    return len(stem) > 3 and stem in lowered
