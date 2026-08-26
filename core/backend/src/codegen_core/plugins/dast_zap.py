"""Runtime security testing (step 19)."""

from __future__ import annotations

import json
from pathlib import Path

from .base import BasePlugin

RISK = {"3": "HIGH", "2": "MEDIUM", "1": "LOW", "0": "INFO"}


class ZapPlugin(BasePlugin):
    capability = "dast"
    driver = "zap"

    def scan(self, workspace: Path) -> dict:
        target = getattr(self.cfg, "target_url", "") or ""
        if self.dry_run or not target:
            return {"target": target or "dry-run", "scanner": "zap", "findings": [], "evidence": []}
        report = Path(workspace) / ".zap.json"
        self._run(
            ["zap-baseline.py", "-t", target, "-J", str(report),
             "-r", str(Path(workspace) / ".zap.html")],
            cwd=workspace, timeout=3600,
        )
        if not report.exists():
            return {"target": target, "scanner": "zap", "findings": [], "evidence": []}
        data = json.loads(report.read_text())
        findings = [
            {
                "id": alert.get("pluginid", ""),
                "severity": RISK.get(str(alert.get("riskcode", "0")), "INFO"),
                "title": alert.get("name", "")[:200],
                "file": (alert.get("instances") or [{}])[0].get("uri"),
                "line": None,
                "remediation": (alert.get("solution") or "")[:500],
            }
            for site in data.get("site", [])
            for alert in site.get("alerts", [])
        ]
        return {"target": target, "scanner": "zap", "findings": findings, "evidence": []}
