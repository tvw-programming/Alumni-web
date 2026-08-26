"""Tracker adapter backed by markdown files on disk.

Same capability as the Jira adapter, different driver: it reads a story from
`<stories_dir>/<KEY>.md` instead of calling an API. That makes the pipeline
runnable with no tracker credentials — which is what the container image needs
to boot into something useful on first start.

Format is YAML-ish front matter plus markdown:

    ---
    key: DEEP-2041
    title: Implement user profile avatar upload feature
    priority: High
    labels: [profile, media]
    ---

    ## Description
    ...

    ## Acceptance Criteria
    - AC-1 ...

Only the fields the pipeline consumes are parsed. Anything else in the front
matter is carried through untouched, so a team can keep their own metadata
alongside without this adapter needing to know about it.
"""

from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any

from ..core.errors import CodeGenCoreError
from .base import BasePlugin

FRONT_MATTER = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.S)
SCALAR_LIST = re.compile(r"\A\[(.*)\]\Z")
BULLET = re.compile(r"^\s*[-*\u2022]\s+(.*)$")


def _coerce(raw: str) -> Any:
    """Front matter values: inline lists, quoted strings, or bare scalars."""
    value = raw.strip()
    m = SCALAR_LIST.match(value)
    if m:
        inner = m.group(1).strip()
        if not inner:
            return []
        return [item.strip().strip('"\'') for item in inner.split(",")]
    if value.startswith(("'", '"')) and value.endswith(("'", '"')) and len(value) > 1:
        return value[1:-1]
    return value


def parse_front_matter(text: str) -> tuple[dict[str, Any], str]:
    match = FRONT_MATTER.match(text)
    if not match:
        return {}, text
    meta: dict[str, Any] = {}
    for line in match.group(1).splitlines():
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        key, _, raw = line.partition(":")
        if not _:
            continue
        meta[key.strip()] = _coerce(raw)
    return meta, text[match.end() :]


def section(body: str, *titles: str) -> list[str]:
    """Bullets under the first matching `## Heading`, in document order."""
    wanted = {t.lower() for t in titles}
    out: list[str] = []
    capturing = False
    for line in body.splitlines():
        heading = re.match(r"^#{2,3}\s+(.*)$", line)
        if heading:
            capturing = heading.group(1).strip().lower() in wanted
            continue
        if capturing:
            bullet = BULLET.match(line)
            if bullet:
                out.append(bullet.group(1).strip())
    return out


def prose(body: str, *titles: str) -> str:
    wanted = {t.lower() for t in titles}
    lines: list[str] = []
    capturing = False
    for line in body.splitlines():
        heading = re.match(r"^#{2,3}\s+(.*)$", line)
        if heading:
            if capturing:
                break
            capturing = heading.group(1).strip().lower() in wanted
            continue
        if capturing:
            lines.append(line)
    return "\n".join(lines).strip()


class FileTrackerPlugin(BasePlugin):
    capability = "tracker"
    driver = "file"

    def _root(self) -> Path:
        return Path(getattr(self.cfg, "stories_dir", "./stories") or "./stories")

    def available(self) -> list[str]:
        root = self._root()
        return sorted(p.stem for p in root.glob("*.md")) if root.exists() else []

    # ------------------------------------------------------------------ #
    def fetch_story(self, key: str) -> dict:
        path = self._root() / f"{key}.md"
        if not path.exists():
            found = self.available()
            raise CodeGenCoreError(
                f"No story file at {path}. "
                + (f"Available: {', '.join(found)}" if found else "The stories directory is empty.")
            )

        meta, body = parse_front_matter(path.read_text())
        criteria = section(body, "acceptance criteria", "acceptance-criteria")
        if not criteria:
            raise CodeGenCoreError(
                f"{path.name} has no '## Acceptance Criteria' section. "
                "The pipeline traces every change back to a criterion id, so a story "
                "without them cannot be verified later."
            )

        description = prose(body, "description") or body.strip()
        scope_out = section(body, "out of scope", "out-of-scope", "non-goals")
        if scope_out:
            description += "\n\nOut of scope:\n" + "\n".join(f"- {s}" for s in scope_out)

        story = {
            "key": meta.get("key", key),
            "title": meta.get("title", key),
            "description": description,
            "acceptance_criteria": criteria,
            "priority": meta.get("priority", "Medium"),
            "labels": meta.get("labels", []) or [],
            "components": meta.get("components", []) or [],
            "dependencies": meta.get("dependencies", []) or [],
            "attachments": [],
            "reporter": meta.get("reporter"),
        }
        story["source_checksum"] = hashlib.sha256(
            json.dumps(story, sort_keys=True, default=str).encode()
        ).hexdigest()
        return story

    def create_remediation_issues(self, findings: list) -> list[str]:
        """Written beside the story so a human sees them without leaving the repo."""
        if not findings:
            return []
        out = self._root() / "remediation"
        out.mkdir(parents=True, exist_ok=True)
        created = []
        for i, finding in enumerate(findings, 1):
            name = f"REMEDIATION-{i:03d}.md"
            (out / name).write_text(
                f"# {finding.get('title', 'Finding')}\n\n"
                f"- **Severity:** {finding.get('severity', 'UNKNOWN')}\n"
                f"- **File:** {finding.get('file', 'n/a')}"
                f"{':' + str(finding['line']) if finding.get('line') else ''}\n\n"
                f"{finding.get('remediation', 'No remediation guidance was supplied.')}\n"
            )
            created.append(name)
        return created
