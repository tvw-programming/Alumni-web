"""Jira adapter (step 01, plus remediation ticket creation)."""

from __future__ import annotations

import hashlib
import json
import os
import urllib.request
from base64 import b64encode
from typing import Any

from .base import BasePlugin


class JiraPlugin(BasePlugin):
    capability = "tracker"
    driver = "jira"

    def _auth_header(self) -> dict[str, str]:
        user = os.getenv(getattr(self.cfg, "auth", {}).get("user_env", "JIRA_USER") if isinstance(getattr(self.cfg, "auth", {}), dict) else "JIRA_USER", "")
        token = os.getenv("JIRA_TOKEN", "")
        raw = b64encode(f"{user}:{token}".encode()).decode()
        return {"Authorization": f"Basic {raw}", "Accept": "application/json"}

    # ------------------------------------------------------------------ #
    def fetch_story(self, key: str) -> dict:
        """Return a JiraStoryV1-shaped dict."""
        base = getattr(self.cfg, "base_url", "") or ""
        if self.dry_run or not base:
            return self._fixture(key)
        url = f"{base.rstrip('/')}/rest/api/3/issue/{key}?expand=renderedFields"
        req = urllib.request.Request(url, headers=self._auth_header())
        with urllib.request.urlopen(req, timeout=30) as resp:  # noqa: S310
            payload = json.loads(resp.read())
        return self._normalise(payload)

    def _normalise(self, payload: dict) -> dict:
        f = payload.get("fields", {})
        desc = f.get("description")
        if isinstance(desc, dict):
            desc = _adf_to_text(desc)
        story = {
            "key": payload.get("key", ""),
            "title": f.get("summary", ""),
            "description": desc or "",
            "acceptance_criteria": _extract_criteria(desc or ""),
            "priority": (f.get("priority") or {}).get("name", "Medium"),
            "labels": f.get("labels", []),
            "components": [c.get("name") for c in f.get("components", [])],
            "dependencies": [
                link.get("outwardIssue", {}).get("key")
                for link in f.get("issuelinks", [])
                if link.get("outwardIssue")
            ],
            "attachments": [
                {"filename": a.get("filename"), "mime_type": a.get("mimeType"), "uri": a.get("content")}
                for a in f.get("attachment", [])
            ],
            "reporter": (f.get("reporter") or {}).get("displayName"),
        }
        story["source_checksum"] = hashlib.sha256(
            json.dumps(story, sort_keys=True, default=str).encode()
        ).hexdigest()
        return story

    def create_remediation_issues(self, findings: list) -> list[str]:
        if self.dry_run:
            return [f"DRYRUN-{i}" for i, _ in enumerate(findings, 1)]
        return []  # real creation intentionally left to a follow-up PR

    # ------------------------------------------------------------------ #
    def _fixture(self, key: str) -> dict:
        story = {
            "key": key,
            "title": "Allow users to export their own data",
            "description": (
                "As a signed-in user I want to export my profile and order history "
                "so that I can keep my own records.\n\n"
                "Acceptance Criteria:\n"
                "- AC-1 An authenticated user can request an export of their own data\n"
                "- AC-2 The export contains profile and order history as CSV\n"
                "- AC-3 A user cannot request an export for another user\n"
            ),
            "acceptance_criteria": [
                "AC-1 An authenticated user can request an export of their own data",
                "AC-2 The export contains profile and order history as CSV",
                "AC-3 A user cannot request an export for another user",
            ],
            "priority": "High",
            "labels": ["self-service", "privacy"],
            "components": ["api", "web"],
            "dependencies": [],
            "attachments": [],
            "reporter": "fixture",
        }
        story["source_checksum"] = hashlib.sha256(
            json.dumps(story, sort_keys=True, default=str).encode()
        ).hexdigest()
        return story


def _adf_to_text(node: Any) -> str:
    if isinstance(node, dict):
        if node.get("type") == "text":
            return node.get("text", "")
        return "".join(_adf_to_text(c) for c in node.get("content", [])) + (
            "\n" if node.get("type") in ("paragraph", "listItem") else ""
        )
    if isinstance(node, list):
        return "".join(_adf_to_text(n) for n in node)
    return ""


def _extract_criteria(description: str) -> list[str]:
    out, capturing = [], False
    for line in description.splitlines():
        low = line.lower().strip()
        if "acceptance criteria" in low:
            capturing = True
            continue
        if capturing:
            if line.strip().startswith(("-", "*", "•")):
                out.append(line.strip().lstrip("-*• ").strip())
            elif line.strip() == "":
                continue
            else:
                break
    return out
