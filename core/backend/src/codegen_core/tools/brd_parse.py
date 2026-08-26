"""Markdown to BrdV1 — reading a human's BRD back into the pipeline's contract.

Step 05 renders BrdV1 to markdown for a person to read. When that person hands
back an edited document at gate 06, it has to become BrdV1 again, because
everything downstream traces to acceptance criteria ids: step 07 designs tests
against them, 13 verifies code against them, 23 reviews against them. A BRD the
pipeline cannot parse is a BRD that silently stops constraining anything.

The parser is deliberately forgiving about layout and strict about content. It
accepts the headings a reviewer is likely to keep and several ways of writing a
criterion id, but it refuses a document with no title or no acceptance criteria
rather than inventing either — the non-invention rule applies to a human's
document as much as to a model's.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from ..core.errors import DocumentRejected
from ..schemas.brd import AcceptanceCriterion, BrdV1

#: Heading text (normalised) -> BrdV1 field.
SECTIONS: dict[str, str] = {
    "background": "background",
    "context": "background",
    "objectives": "objectives",
    "objective": "objectives",
    "goals": "objectives",
    "in scope": "scope_in",
    "scope in": "scope_in",
    "scope": "scope_in",
    "out of scope": "scope_out",
    "scope out": "scope_out",
    "not in scope": "scope_out",
    "non goals": "scope_out",
    "acceptance criteria": "acceptance_criteria",
    "acceptance": "acceptance_criteria",
    "risks": "risks",
    "risk": "risks",
    "assumptions": "assumptions",
    "assumption": "assumptions",
}

#: The heading step 05 writes above the title; not a section of its own.
DOCUMENT_HEADING = "business requirement document"

HEADING_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
BULLET_RE = re.compile(r"^\s*(?:[-*+]|\d+[.)])\s+(.*\S)\s*$")
#: `**AC-3** text`, `AC-3: text`, `[AC-3] - text`, `AC3 — text`
CRITERION_ID_RE = re.compile(
    r"^\**\[?\s*([A-Za-z]{1,8}[-_ ]?\d+(?:\.\d+)*)\s*\]?\**\s*[:\.\-–—]?\s+(.*\S)\s*$"
)
PLACEHOLDER = "(none)"


@dataclass
class ParsedBrd:
    """The parsed document plus anything the reader should know about it."""

    brd: BrdV1
    #: Non-fatal observations, surfaced to the uploader and written to the journal.
    warnings: list[str] = field(default_factory=list)


def normalise_heading(text: str) -> str:
    """`### Out of Scope:` -> `out of scope`."""
    cleaned = re.sub(r"[^a-z0-9 ]+", " ", text.lower())
    return re.sub(r"\s+", " ", cleaned).strip()


def parse_brd_markdown(markdown: str) -> ParsedBrd:
    """Parse a BRD document, or say precisely why it is not usable."""
    if not markdown.strip():
        raise DocumentRejected("the document is empty")

    title = ""
    current: str | None = None
    prose: dict[str, list[str]] = {}
    bullets: dict[str, list[str]] = {}
    preamble: list[str] = []

    for raw in markdown.splitlines():
        heading = HEADING_RE.match(raw)
        if heading:
            text = heading.group(2).strip()
            key = normalise_heading(text)
            if key in SECTIONS:
                current = SECTIONS[key]
                continue
            if key == DOCUMENT_HEADING:
                current = None
                continue
            # Any other heading before the first known section is the title:
            # step 05 writes `# Business Requirement Document` then `## <title>`.
            if not title:
                title = text
            current = None
            continue

        line = raw.strip()
        if not line:
            continue
        bullet = BULLET_RE.match(line)
        if current is None:
            if not title:
                preamble.append(line)
            continue
        if bullet:
            item = _strip_emphasis(bullet.group(1))
            if item.lower() != PLACEHOLDER:
                bullets.setdefault(current, []).append(item)
        else:
            prose.setdefault(current, []).append(line)

    if not title and preamble:
        title = _strip_emphasis(preamble[0])
    if not title:
        raise DocumentRejected(
            "the document has no title. Give it a heading naming the change, "
            "the way `## <title>` appears in the BRD you downloaded."
        )

    criteria, warnings = _criteria(bullets.get("acceptance_criteria", []))
    if not criteria:
        raise DocumentRejected(
            "the document has no acceptance criteria. Every downstream step traces "
            "to them, so a BRD without an `### Acceptance Criteria` section listing "
            "`- **AC-1** …` bullets cannot replace one that has them."
        )

    brd = BrdV1(
        title=title,
        background="\n".join(prose.get("background", [])).strip(),
        objectives=bullets.get("objectives", []),
        scope_in=bullets.get("scope_in", []),
        scope_out=bullets.get("scope_out", []),
        acceptance_criteria=criteria,
        risks=bullets.get("risks", []),
        assumptions=bullets.get("assumptions", []),
    )
    if not brd.objectives:
        warnings.append("No objectives section was found; the BRD records none.")
    return ParsedBrd(brd=brd, warnings=warnings)


def _strip_emphasis(text: str) -> str:
    return re.sub(r"\*\*(.+?)\*\*", r"\1", text).strip()


def _criteria(items: list[str]) -> tuple[list[AcceptanceCriterion], list[str]]:
    """Bullets to criteria, keeping the ids the author wrote wherever there are any.

    Ids are the traceability key, so a document that carries them keeps them
    verbatim. A document without them gets positional ids and a warning: that is
    a renumbering the reviewer needs to know about, because step 07's tests and
    step 13's verification will quote whatever ends up here.
    """
    criteria: list[AcceptanceCriterion] = []
    warnings: list[str] = []
    synthesised = 0

    for position, item in enumerate(items, start=1):
        match = CRITERION_ID_RE.match(item)
        if match:
            criteria.append(
                AcceptanceCriterion(
                    id=match.group(1).replace(" ", "-").replace("_", "-").upper(),
                    text=_strip_emphasis(match.group(2)),
                )
            )
        else:
            synthesised += 1
            criteria.append(
                AcceptanceCriterion(id=f"AC-{position}", text=_strip_emphasis(item))
            )

    if synthesised:
        warnings.append(
            f"{synthesised} acceptance criteria had no id and were numbered AC-1..AC-{len(items)} "
            "in document order. Downstream steps will quote those ids."
        )
    duplicates = {c.id for c in criteria if [x.id for x in criteria].count(c.id) > 1}
    if duplicates:
        warnings.append(
            f"duplicate acceptance criteria ids: {', '.join(sorted(duplicates))}. "
            "Traceability cannot distinguish them."
        )
    return criteria, warnings
