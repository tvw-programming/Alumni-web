"""Dependency / supply-chain scan (step 18)."""

from __future__ import annotations

import json
from pathlib import Path

from .base import BasePlugin


class TrivyPlugin(BasePlugin):
    capability = "sca"
    driver = "trivy"

    def scan(self, workspace: Path) -> dict:
        if self.dry_run:
            return {"scanner": "trivy", "findings": []}
        proc = self._run(self._cmd(["trivy", "fs", "--format", "json", "."]),
                         cwd=workspace, timeout=1800)
        try:
            data = json.loads(proc.stdout)
        except json.JSONDecodeError:
            return {"scanner": "trivy", "findings": [], "error": proc.stderr[-1500:]}
        findings = []
        for result in data.get("Results", []):
            for v in result.get("Vulnerabilities", []) or []:
                findings.append({
                    "id": v.get("VulnerabilityID", ""),
                    "severity": (v.get("Severity") or "LOW").upper(),
                    "title": f"{v.get('PkgName')} {v.get('InstalledVersion')}: {v.get('Title', '')}"[:200],
                    "file": result.get("Target"),
                    "line": None,
                    "remediation": f"upgrade to {v.get('FixedVersion') or 'a patched version'}",
                })
        return {"scanner": "trivy", "findings": findings}
