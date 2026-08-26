"""Requirement -> code -> test traceability, used by step 13.

Deterministic pre-pass: it finds which acceptance-criteria ids appear in the
changed files and test names. The verification agent then reasons over the gaps
rather than over the whole diff, which keeps its job small and its output stable.
"""

from __future__ import annotations

import re
from pathlib import Path


def build(
    acceptance_ids: list[str], changed_files: list[str], workspace: Path
) -> dict[str, dict]:
    matrix: dict[str, dict] = {ac: {"files": [], "tests": []} for ac in acceptance_ids}
    for rel in changed_files:
        path = Path(workspace) / rel
        if not path.exists():
            continue
        try:
            body = path.read_text()
        except (UnicodeDecodeError, OSError):
            continue
        for ac in acceptance_ids:
            if re.search(rf"\b{re.escape(ac)}\b", body):
                key = "tests" if "test" in rel.lower() else "files"
                matrix[ac][key].append(rel)
    return matrix


def uncovered(matrix: dict[str, dict]) -> list[str]:
    return [ac for ac, hits in matrix.items() if not hits["files"] and not hits["tests"]]
