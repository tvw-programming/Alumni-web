"""Answer step-03 ambiguity questions from the run monitor.

The dashboard lists `questions_for_human` when a step finishes AMBIGUOUS, but
until this module existed there was nowhere on that screen to type the answers.
Reviewers had to leave, edit the ticket, and start a new run.

Flow:

1. Collect one non-empty answer per blocking question.
2. Append (or replace) a Clarifications block on the story description.
3. Persist `story_input.json` so step 01 prefers the clarified text over the
   tracker.
4. Invalidate steps 01 through the ambiguity step so resume re-reads the story.
5. Record `ambiguity_clarified` + `clarification_requested` for the watcher.

`ambiguity_clarified` also resets the AMBIGUITY remediation loop budget: without
that, a run that already exhausted its loops would halt again on the first
re-check even after the ticket was fixed.
"""

from __future__ import annotations

import re
from typing import Any

from ..core import story_input
from ..core.errors import CodeGenCoreError

CLARIFICATION_HEADING = "## Clarifications from run monitor"
_CLARIFICATION_BLOCK = re.compile(
    r"\n*" + re.escape(CLARIFICATION_HEADING) + r".*\Z",
    re.S,
)


class ClarificationError(CodeGenCoreError):
    """The answers are incomplete or the step is not waiting on questions."""


def _questions_from_report(report: dict) -> list[dict]:
    return [q for q in report.get("questions_for_human", []) if isinstance(q, dict) and q.get("id")]


def _strip_prior_clarifications(description: str) -> str:
    return _CLARIFICATION_BLOCK.sub("", description or "").rstrip()


def _format_clarifications(pairs: list[tuple[str, str, str]]) -> str:
    lines = [CLARIFICATION_HEADING, ""]
    for qid, question, answer in pairs:
        lines.append(f"### {qid}")
        lines.append(f"**Question:** {question}")
        lines.append(f"**Answer:** {answer.strip()}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def _base_story(ctx: Any, *, presenter: Any) -> dict:
    """Prefer the hand-written input; fall back to the step-01 artifact."""
    typed = story_input.load(ctx)
    if typed is not None:
        return typed.model_dump()
    artifact = presenter._read_json_artifact(1)  # noqa: SLF001 - same store the UI reads
    if isinstance(artifact, dict) and artifact.get("key") and artifact.get("title"):
        return {
            "key": artifact["key"],
            "title": artifact["title"],
            "description": artifact.get("description") or "",
            "acceptance_criteria": list(artifact.get("acceptance_criteria") or []),
            "priority": artifact.get("priority") or "Medium",
            "labels": list(artifact.get("labels") or []),
            "entered_by": artifact.get("reporter") or "",
        }
    raise ClarificationError(
        "No story is on file for this run. Start a run with story details, then answer here."
    )


def clarify(
    ctx: Any,
    *,
    step: int,
    answers: list[dict[str, str]],
    answered_by: str,
    presenter: Any,
    component: Any,
) -> dict:
    """Persist answers, invalidate 01..step, and ask the watcher to resume."""
    status = presenter.step_payload(step, component)["status"]
    if status != "NEEDS_INPUT":
        raise ClarificationError(
            f"Step {step:02d} is {status.replace('_', ' ').lower()}, "
            "not waiting on answers."
        )

    report = presenter._read_json_artifact(step)  # noqa: SLF001
    if not isinstance(report, dict):
        raise ClarificationError(f"Step {step:02d} has no ambiguity report to answer.")

    questions = _questions_from_report(report)
    if not questions:
        raise ClarificationError(f"Step {step:02d} is not holding any questions.")

    by_id = {str(a.get("id", "")).strip(): str(a.get("answer", "")).strip() for a in answers}
    missing = [str(q["id"]) for q in questions if not by_id.get(str(q["id"]))]
    if missing:
        raise ClarificationError(
            "Every blocking question needs an answer. Still empty: " + ", ".join(missing)
        )

    pairs = [
        (str(q["id"]), str(q.get("text") or ""), by_id[str(q["id"])])
        for q in questions
    ]

    base = _base_story(ctx, presenter=presenter)
    criteria = [c for c in base.get("acceptance_criteria") or [] if str(c).strip()]
    if not criteria:
        # ManualStoryInput refuses an empty list; keep the run movable.
        criteria = [
            "Clarifications recorded in the run monitor must be honoured by later steps"
        ]

    description = _strip_prior_clarifications(str(base.get("description") or ""))
    if description:
        description = description.rstrip() + "\n\n" + _format_clarifications(pairs)
    else:
        description = _format_clarifications(pairs)

    who = (answered_by or "").strip() or "dashboard-user"
    # Strip control chars that break JSON responses / journal rendering.
    description = "".join(ch for ch in description if ch == "\n" or ch == "\t" or ord(ch) >= 32)
    story_input.save(
        ctx,
        {
            "key": base["key"],
            "title": base["title"],
            "description": description,
            "acceptance_criteria": criteria,
            "priority": base.get("priority") or "Medium",
            "labels": list(base.get("labels") or []),
            "entered_by": who,
        },
    )

    cleared = ctx.journal.invalidate_steps(
        list(range(1, step + 1)),
        reason=f"ambiguity clarified at step {step:02d}",
    )
    ctx.journal.append_event(
        "ambiguity_clarified",
        step=step,
        answered_by=who,
        question_ids=[qid for qid, _, _ in pairs],
        invalidated=cleared,
    )
    # Same intent shape as run_requested: the watcher resumes from the first
    # incomplete step (now step 01 after invalidation).
    ctx.journal.append_event(
        "clarification_requested",
        step=step,
        answered_by=who,
    )

    return {
        "questionIds": [qid for qid, _, _ in pairs],
        "invalidated": cleared,
        "answeredBy": who,
    }
