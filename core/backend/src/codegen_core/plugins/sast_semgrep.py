"""Static analysis (step 18)."""

from __future__ import annotations

import json
from pathlib import Path

from .base import BasePlugin

SEVERITY = {"ERROR": "HIGH", "WARNING": "MEDIUM", "INFO": "LOW"}


class SemgrepPlugin(BasePlugin):
    capability = "sast"
    driver = "semgrep"

    def scan(self, workspace: Path) -> dict:
        if self.dry_run:
            return {"scanner": "semgrep", "findings": []}
        proc = self._run(self._cmd(["semgrep", "--config", "auto", "--json"]),
                         cwd=workspace, timeout=1800)
        try:
            data = json.loads(proc.stdout)
        except json.JSONDecodeError:
            return {"scanner": "semgrep", "findings": [],
                    "error": proc.stderr[-1500:]}
        findings = [
            {
                "id": r.get("check_id", ""),
                "severity": SEVERITY.get((r.get("extra", {}).get("severity") or "").upper(), "LOW"),
                "title": r.get("extra", {}).get("message", "")[:200],
                "file": r.get("path"),
                "line": (r.get("start") or {}).get("line"),
                "remediation": r.get("extra", {}).get("fix", "") or "",
            }
            for r in data.get("results", [])
        ]
        return {"scanner": "semgrep", "findings": findings}
