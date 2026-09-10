"""Diff generation and parsing."""

from __future__ import annotations

import difflib
import re
import subprocess
from pathlib import Path

HUNK_RE = re.compile(r"^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@")


def repo_scope(workspace: Path) -> tuple[Path | None, str]:
    """(repository root, path of `workspace` within it) — or (None, "").

    Git answers questions about the repository it *finds*, walking up from the
    directory it is given. A workspace nested inside another checkout — the
    default `./workspace/{job_id}` sits inside this very repository, and a
    monorepo package sits inside its parent — therefore gets answers about the
    enclosing repository unless every command is scoped deliberately.

    That is not a hypothetical: it is how a run once recorded 25 changed files
    and 1703 lines of somebody's unrelated edits as its own work, and passed
    them to review as the story's implementation.
    """
    try:
        root = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=workspace, capture_output=True, text=True, timeout=60,
        )
        prefix = subprocess.run(
            ["git", "rev-parse", "--show-prefix"],
            cwd=workspace, capture_output=True, text=True, timeout=60,
        )
    except (FileNotFoundError, subprocess.TimeoutExpired, NotADirectoryError):
        return None, ""
    if root.returncode != 0:
        return None, ""
    return Path(root.stdout.strip()), prefix.stdout.strip()


def parse_porcelain(payload: str, prefix: str = "") -> tuple[list[str], list[str]]:
    """`git status --porcelain -z` into (changed, created), workspace-relative.

    Written against the format rather than around it. Each record is two status
    characters, a space, then the path; splitting on the first space instead
    yields an empty status and a path beginning "M ", which is how
    `M core/backend/.../07_test_design.system.md` came to be recorded as a
    filename. Renames and copies emit a second record holding the old path,
    which is consumed here rather than mistaken for another file.

    `prefix` is the workspace's own path inside the repository; git reports
    paths from the repository root, and everything downstream — the impact
    manifest globs, the paths staged for commit — is relative to the workspace.
    """
    changed: list[str] = []
    created: list[str] = []
    records = [r for r in payload.split("\0") if r]
    index = 0
    while index < len(records):
        record = records[index]
        index += 1
        if len(record) < 4:
            continue
        status, path = record[:2], record[3:]
        if status[0] in ("R", "C"):
            # The record that follows is the source path, not another change.
            index += 1
        if prefix:
            if not path.startswith(prefix):
                continue
            path = path[len(prefix):]
        if not path:
            continue
        (created if "?" in status or "A" in status or status[0] in ("R", "C") else changed).append(path)
    return changed, created


def git_diff(workspace: Path) -> str:
    """The working-tree diff, scoped to `workspace` and nothing above it."""
    try:
        proc = subprocess.run(
            # `-- .` keeps an enclosing repository's unrelated edits out of it.
            ["git", "diff", "HEAD", "--", "."],
            cwd=workspace, capture_output=True, text=True, timeout=60,
        )
        return proc.stdout
    except (FileNotFoundError, subprocess.TimeoutExpired, NotADirectoryError):
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
