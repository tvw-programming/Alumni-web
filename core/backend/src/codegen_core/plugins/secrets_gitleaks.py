"""Secrets detection (step 18)."""

from __future__ import annotations

import json
from pathlib import Path

from .base import BasePlugin


class GitleaksPlugin(BasePlugin):
    capability = "secrets"
    driver = "gitleaks"

    def scan(self, workspace: Path) -> dict:
        if self.dry_run:
            return {"scanner": "gitleaks", "findings": []}
        report = Path(workspace) / ".gitleaks.json"
        self._run(
            self._cmd(["gitleaks", "detect", "--no-git", "--report-format", "json",
                       "--report-path", str(report)]),
            cwd=workspace, timeout=900,
        )
        if not report.exists():
            return {"scanner": "gitleaks", "findings": []}
        data = json.loads(report.read_text() or "[]")
        findings = [
            {
                "id": item.get("RuleID", "secret"),
                "severity": "CRITICAL",          # any live secret blocks the pipeline
                "title": f"potential secret: {item.get('Description', '')}"[:200],
                "file": item.get("File"),
                "line": item.get("StartLine"),
                "remediation": "rotate the credential and move it to the secret manager",
            }
            for item in data
        ]
        return {"scanner": "gitleaks", "findings": findings}
