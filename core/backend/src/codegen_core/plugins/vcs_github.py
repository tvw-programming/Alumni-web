"""GitHub adapter (step 22) plus local git helpers used by step 12."""

from __future__ import annotations

import json
import os
import subprocess
import urllib.request
from pathlib import Path
from typing import Any

from ..tools.diff_tools import changed_loc, git_diff
from .base import BasePlugin


class GitHubPlugin(BasePlugin):
    capability = "vcs"
    driver = "github"

    # -------------------------- local git ----------------------------- #
    def snapshot_changes(self, workspace: Path) -> dict:
        """Structured view of the working tree, used to build CodeChangesetV1."""
        diff = git_diff(workspace)
        changed, created = [], []
        try:
            proc = subprocess.run(
                ["git", "status", "--porcelain"], cwd=workspace,
                capture_output=True, text=True, timeout=60,
            )
            for line in proc.stdout.splitlines():
                status, _, path = line.partition(" ")
                path = path.strip()
                (created if "?" in status or "A" in status else changed).append(path)
        except (FileNotFoundError, subprocess.TimeoutExpired):
            pass
        return {
            "changed_files": [p for p in changed if p],
            "created_files": [p for p in created if p],
            "changed_loc": changed_loc(diff),
            "commits": [],
            "unified_diff": diff,
        }

    def branch_name(self, jira_id: str, slug: str) -> str:
        template = getattr(self.cfg, "branch_template", "codegen/{jira_id}-{slug}")
        return template.format(jira_id=jira_id, slug=slug)

    # ---------------------------- remote ------------------------------ #
    def open_pull_request(self, *, title: str, body: str, head: str, base: str = "main") -> dict:
        repo = getattr(self.cfg, "repo", "") or ""
        token = os.getenv("GITHUB_TOKEN", "")
        if self.dry_run or not repo or not token:
            return {
                "number": 0, "url": f"https://github.com/{repo or 'dry-run'}/pull/0",
                "head": head, "base": base, "draft": True, "dry_run": True, "title": title,
            }
        payload = json.dumps(
            {"title": title, "body": body, "head": head, "base": base,
             "draft": bool(getattr(self.cfg, "draft_pr", True))}
        ).encode()
        req = urllib.request.Request(
            f"https://api.github.com/repos/{repo}/pulls",
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "Content-Type": "application/json",
            },
        )
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            data = json.loads(resp.read())
        return {"number": data.get("number"), "url": data.get("html_url"),
                "head": head, "base": base, "draft": data.get("draft", False)}

    def merge(self, pr_number: int) -> dict:
        """Only ever called after gate 24 records an APPROVED decision."""
        if self.dry_run or not pr_number:
            return {"merged": True, "dry_run": True, "sha": "0" * 40}
        return {"merged": False, "reason": "merge requires an explicit human action in this build"}
