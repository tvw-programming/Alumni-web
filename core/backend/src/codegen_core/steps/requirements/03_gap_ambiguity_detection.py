"""Step 03 - Requirement Gap / Ambiguity Detection.

Component: AGENT                Category: Requirement QA / Non-invention

This step exists to make the pipeline say "I don't know". Its output is a list of
things the ticket does NOT specify. The prompt forbids proposing answers - a gap
that gets quietly filled here becomes a hallucinated feature at step 12 and an
argument at step 24.

If blocking=true, the runner halts and opens a question ticket. That is
config.policy.non_invention.on_ambiguity = halt_and_ticket doing its job.

When a reviewer answers those questions in the run monitor, the answers are
appended under "## Clarifications from run monitor". This step must honour that
block: re-asking the same ids after a human answered them is a loop, not QA.
"""

from __future__ import annotations

import re
from typing import Any

from codegen_core.core import story_input
from ._base import JsonAgentStep

CLARIFICATION_HEADING = "## Clarifications from run monitor"
_ANSWERED_IDS = re.compile(r"^###\s+(Q\d+)\s*$", re.M | re.I)


def _answered_question_ids_from_text(description: str) -> set[str]:
    idx = description.find(CLARIFICATION_HEADING)
    if idx < 0:
        return set()
    return {m.upper() for m in _ANSWERED_IDS.findall(description[idx:])}


def _answered_question_ids(ctx: Any) -> set[str]:
    """Ids already answered in the run-monitor clarifications block.

    Prefer the live JiraStoryV1, then fall back to story_input.json — the file
    the clarify endpoint just wrote — so a stale rehydrate cannot hide answers.
    """
    found: set[str] = set()
    story = ctx.recall("JiraStoryV1")
    if isinstance(story, dict):
        found |= _answered_question_ids_from_text(str(story.get("description") or ""))
    try:
        typed = story_input.load(ctx)
    except Exception:  # noqa: BLE001 - unreadable input must not crash QA
        typed = None
    if typed is not None:
        found |= _answered_question_ids_from_text(typed.description or "")
    return found


class GapAmbiguityDetection(JsonAgentStep):
    step = 3
    name = "gap_ambiguity_detection"
    category = "Requirement QA / Non-invention"
    capability = "reasoning"
    consumes = ["JiraStoryV1", "StoryAnalysisV1"]
    emits = "AmbiguityReportV1"
    slug = "ambiguity_report"
    produces = ["03_ambiguity_report__{job}__v{v}.json"]
    accepts = ["application/json"]

    def post_process(self, payload: dict, ctx: Any) -> dict:
        answered = _answered_question_ids(ctx)
        questions = list(payload.get("questions_for_human") or [])
        if answered and questions:
            remaining = []
            for q in questions:
                if not isinstance(q, dict):
                    remaining.append(q)
                    continue
                qid = str(q.get("id") or "").strip().upper()
                if qid not in answered:
                    remaining.append(q)
            dropped = len(questions) - len(remaining)
            if dropped:
                payload["questions_for_human"] = remaining
                payload.setdefault("gaps", [])
                if isinstance(payload["gaps"], list):
                    payload["gaps"].append(
                        f"{dropped} question(s) already answered in "
                        f"'{CLARIFICATION_HEADING}' and were not re-asked."
                    )

        remaining_qs = [q for q in (payload.get("questions_for_human") or []) if isinstance(q, dict)]
        if any(q.get("blocks_step") for q in remaining_qs):
            payload["blocking"] = True
        elif answered:
            # Human already answered on the monitor; do not halt again on the
            # same ids even if the model left blocking=true with an empty list.
            payload["blocking"] = False
            payload["questions_for_human"] = remaining_qs
        return payload

    def status_for(self, payload: dict, ctx: Any) -> str:
        if payload.get("blocking") and ctx.cfg.policy.non_invention.on_ambiguity == "halt_and_ticket":
            return "AMBIGUOUS"
        return "OK"


STEP = GapAmbiguityDetection()
