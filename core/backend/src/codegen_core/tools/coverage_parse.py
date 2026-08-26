"""Coverage parsing for steps 16 and 14."""

from __future__ import annotations

import json
import xml.etree.ElementTree as ET
from pathlib import Path


def parse_cobertura(path: Path) -> dict:
    if not Path(path).exists():
        return {"line_pct": 0.0, "changed_line_pct": 0.0, "uncovered_files": []}
    root = ET.parse(path).getroot()
    line_rate = float(root.attrib.get("line-rate", 0)) * 100
    uncovered = [
        cls.attrib.get("filename", "")
        for cls in root.iter("class")
        if float(cls.attrib.get("line-rate", 1)) < 1.0
    ]
    return {"line_pct": round(line_rate, 2), "changed_line_pct": 0.0, "uncovered_files": uncovered[:50]}


def parse_pytest_json(path: Path) -> dict:
    if not Path(path).exists():
        return {"passed": 0, "failed": 0, "skipped": 0, "duration_s": 0.0, "failures": []}
    data = json.loads(Path(path).read_text())
    summary = data.get("summary", {})
    failures = [
        {"nodeid": t.get("nodeid"), "message": (t.get("call", {}).get("longrepr") or "")[:1500]}
        for t in data.get("tests", [])
        if t.get("outcome") == "failed"
    ]
    return {
        "passed": summary.get("passed", 0),
        "failed": summary.get("failed", 0),
        "skipped": summary.get("skipped", 0),
        "duration_s": round(data.get("duration", 0.0), 2),
        "failures": failures,
    }


def changed_line_coverage(coverage: dict, changed_files: list[str]) -> float:
    """Coverage restricted to files this ticket touched - the number that matters."""
    if not changed_files:
        return 100.0
    uncovered = set(coverage.get("uncovered_files", []))
    covered = [f for f in changed_files if f not in uncovered]
    return round(100.0 * len(covered) / len(changed_files), 2)
