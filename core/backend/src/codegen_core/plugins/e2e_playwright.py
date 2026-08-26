"""Integration / E2E execution (step 17).

Runs against an ephemeral environment when config.plugins.e2e_runner.ephemeral_env
is enabled: bring the compose stack up, run, tear down. Screenshots of failures
become .jpg artifacts.
"""

from __future__ import annotations

import json
from pathlib import Path

from .base import BasePlugin


class PlaywrightPlugin(BasePlugin):
    capability = "e2e_runner"
    driver = "playwright"

    def _env(self) -> dict:
        return dict(getattr(self.cfg, "ephemeral_env", {}) or {})

    def up(self, workspace: Path) -> None:
        env = self._env()
        if self.dry_run or not env.get("enabled"):
            return
        self._run(["docker", "compose", "-f", env["compose_file"], "up", "-d"], cwd=workspace, timeout=600)

    def down(self, workspace: Path) -> None:
        env = self._env()
        if self.dry_run or not env.get("enabled") or not env.get("teardown"):
            return
        self._run(["docker", "compose", "-f", env["compose_file"], "down", "-v"], cwd=workspace, timeout=300)

    def run(self, workspace: Path) -> dict:
        if self.dry_run:
            return {"passed": 4, "failed": 0, "skipped": 0, "duration_s": 22.1,
                    "failures": [], "screenshots": []}
        try:
            self.up(workspace)
            argv = self._cmd(["npx", "playwright", "test", "--reporter=json"])
            proc = self._run(argv, cwd=workspace, timeout=3600)
            return self._parse(proc.stdout, workspace)
        finally:
            self.down(workspace)

    def _parse(self, stdout: str, workspace: Path) -> dict:
        try:
            data = json.loads(stdout)
        except json.JSONDecodeError:
            return {"passed": 0, "failed": 1, "skipped": 0, "duration_s": 0.0,
                    "failures": [{"nodeid": "runner", "message": stdout[-2000:]}], "screenshots": []}
        stats = data.get("stats", {})
        failures, shots = [], []
        for suite in data.get("suites", []):
            for spec in suite.get("specs", []):
                for test in spec.get("tests", []):
                    for res in test.get("results", []):
                        if res.get("status") not in ("passed", "skipped"):
                            failures.append({"nodeid": spec.get("title"),
                                             "message": str(res.get("error", ""))[:1500]})
                            shots += [
                                a["path"] for a in res.get("attachments", [])
                                if a.get("contentType", "").startswith("image/")
                            ]
        return {
            "passed": stats.get("expected", 0), "failed": stats.get("unexpected", 0),
            "skipped": stats.get("skipped", 0), "duration_s": round(stats.get("duration", 0) / 1000, 2),
            "failures": failures, "screenshots": shots,
        }
