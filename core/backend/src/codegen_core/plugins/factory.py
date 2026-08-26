"""Capability -> driver -> plugin class.

Same pattern as llm/factory.py: config names the driver, code owns the protocol.
"""

from __future__ import annotations

from typing import Any

from ..core.errors import ConfigError
from .base import BasePlugin
from .dast_zap import ZapPlugin
from .e2e_playwright import PlaywrightPlugin
from .hitl_dashboard import DashboardPlugin
from .notify_slack import SlackPlugin
from .sast_semgrep import SemgrepPlugin
from .sca_trivy import TrivyPlugin
from .secrets_gitleaks import GitleaksPlugin
from .test_pytest import PytestPlugin
from .tracker_file import FileTrackerPlugin
from .tracker_jira import JiraPlugin
from .vcs_github import GitHubPlugin

REGISTRY: dict[str, dict[str, type[BasePlugin]]] = {
    "tracker": {"jira": JiraPlugin, "file": FileTrackerPlugin},
    "vcs": {"github": GitHubPlugin},
    "test_runner": {"pytest": PytestPlugin},
    "e2e_runner": {"playwright": PlaywrightPlugin},
    "sast": {"semgrep": SemgrepPlugin},
    "sca": {"trivy": TrivyPlugin},
    "secrets": {"gitleaks": GitleaksPlugin},
    "dast": {"zap": ZapPlugin},
    "notifier": {"slack": SlackPlugin},
    "dashboard": {"fastapi": DashboardPlugin, "cli": DashboardPlugin},
}


def build_plugin(cfg: Any, capability: str, ctx: Any = None) -> BasePlugin:
    entry = cfg.plugins.get(capability)
    if entry is None:
        raise ConfigError(f"config.plugins has no '{capability}' entry")
    drivers = REGISTRY.get(capability, {})
    cls = drivers.get(entry.driver)
    if cls is None:
        raise ConfigError(
            f"plugin '{capability}': unknown driver '{entry.driver}'. Known: {sorted(drivers)}"
        )
    return cls(entry, ctx)


def build_all(cfg: Any, ctx: Any = None) -> dict[str, BasePlugin]:
    return {cap: build_plugin(cfg, cap, ctx) for cap in cfg.plugins}
