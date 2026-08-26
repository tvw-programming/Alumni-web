"""Plugin base.

A plugin adapts one external system. The *capability* is the config key
(tracker, vcs, sast, dast...); the *driver* is the vendor. Swapping Semgrep for
SonarQube, or GitHub for GitLab, is a driver change in config.plugins.

Every plugin gets a dry_run mode so the whole pipeline can be exercised without
touching real systems.
"""

from __future__ import annotations

import subprocess
from typing import Any


class BasePlugin:
    capability = ""
    driver = ""

    def __init__(self, cfg: Any, ctx: Any = None) -> None:
        self.cfg = cfg          # the PluginCfg entry for this capability
        self.ctx = ctx
        self.dry_run = bool(getattr(cfg, "dry_run", False))

    # ------------------------------------------------------------------ #
    def _run(self, argv: list[str], cwd: Any = None, timeout: int = 900) -> subprocess.CompletedProcess:
        return subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout)

    def _cmd(self, default: list[str]) -> list[str]:
        return list(getattr(self.cfg, "command", None) or default)

    def health(self) -> bool:
        return True
