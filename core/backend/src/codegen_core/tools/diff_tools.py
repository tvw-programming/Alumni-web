"""Diff generation and parsing."""

from __future__ import annotations

import difflib
import re
import subprocess
from pathlib import Path

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


def git_diff(workspace: Path) -> str:
    try:
        proc = subprocess.run(
            ["git", "diff", "HEAD"], cwd=workspace, capture_output=True, text=True, timeout=60
        )
        return proc.stdout
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return ""


def text_diff(before: str, after: str, path: str) -> str:
    return "".join(
        difflib.unified_diff(
            before.splitlines(keepends=True), after.splitlines(keepends=True),
            fromfile=f"a/{path}", tofile=f"b/{path}",
        )
    )


def parse_unified_diff(raw: str) -> list[dict]:
    """Turn a unified diff into structured per-file hunks a model can reason over."""
    files: list[dict] = []
    current: dict | None = None
    for line in raw.splitlines():
        if line.startswith("diff --git") or line.startswith("+++ b/"):
            if line.startswith("+++ b/"):
                current = {"file": line[6:], "hunks": [], "added": 0, "removed": 0}
                files.append(current)
            continue
        if current is None:
            continue
        m = HUNK_RE.match(line)
        if m:
            current["hunks"].append({"old_start": int(m.group(1)), "new_start": int(m.group(3))})
        elif line.startswith("+"):
            current["added"] += 1
        elif line.startswith("-"):
            current["removed"] += 1
    return files


def changed_loc(raw: str) -> int:
    return sum(f["added"] + f["removed"] for f in parse_unified_diff(raw))
