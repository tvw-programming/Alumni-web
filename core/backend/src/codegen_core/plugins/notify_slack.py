"""Notifications for gates, halts and budget events."""

from __future__ import annotations

import json
import os
import urllib.request
from typing import Any

from .base import BasePlugin


class SlackPlugin(BasePlugin):
    capability = "notifier"
    driver = "slack"

    def _should(self, event: str) -> bool:
        wanted = getattr(self.cfg, "notify_on", None)
        return not wanted or event in wanted

    def send(self, event: str, text: str, **fields: Any) -> bool:
        if not self._should(event):
            return False
        hook = os.getenv(getattr(self.cfg, "webhook_env", "SLACK_WEBHOOK") or "SLACK_WEBHOOK", "")
        if self.dry_run or not hook:
            return False
        payload = json.dumps({"text": f"*{event}*\n{text}", "attachments": [{"fields": [
            {"title": k, "value": str(v), "short": True} for k, v in fields.items()
        ]}]}).encode()
        req = urllib.request.Request(hook, data=payload,
                                     headers={"Content-Type": "application/json"})
        try:
            urllib.request.urlopen(req, timeout=15)  # noqa: S310
            return True
        except Exception:  # noqa: BLE001 - notification failure must never fail a job
            return False

    def escalate(self, ctx: Any, edge: Any) -> None:
        self.send(
            "pipeline_halted",
            f"job {getattr(ctx, 'job_id', '?')} exhausted the loop budget on "
            f"{edge.from_step:02d} -> {edge.to_step:02d} ({edge.on})",
        )
