"""Step 19 - DAST / Runtime Security Testing.

Component: PLUGIN + AGENT (triage)      Category: Runtime Security

Runs against a deployed instance with authenticated scenarios. Kept separate
from step 18 deliberately: SAST reads code that might never execute, DAST
exercises code that definitely does. They disagree often, and both disagreements
are informative - a SAST finding DAST cannot reproduce is probably unreachable;
a DAST finding SAST missed is usually a configuration or auth problem rather
than a code one.

The security-capability model triages raw scanner output into an exploitability
judgement, because raw ZAP output has a high false-positive rate and dumping it
into a PR trains reviewers to ignore it.
"""

from __future__ import annotations

import json
from typing import Any

from ..core.component import Plugin
from ..core.envelope import Envelope
from ..core.parts import structured
from ..plugins.factory import build_plugin
from ..schemas.security import DastReportV1


class DastRuntimeSecurity(Plugin):
    step = 19
    name = "dast_runtime_security"
    category = "Runtime Security"
    consumes = ["FeatureSpecV1", "SecurityScanV1"]
    produces = ["19_dast_report__{job}__v{v}.json", "19_evidence_*__{job}__v{v}.jpg"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        scanner = build_plugin(ctx.cfg, "dast", ctx)
        report = DastReportV1.model_validate(scanner.scan(ctx.workspace))
        payload = report.model_dump(mode="json")

        blocking = report.blocking(ctx.policy.blocking_severities())
        if blocking:
            payload["triage"] = self._triage(ctx, payload)

        ctx.remember("DastReportV1", payload)
        ctx.artifacts.write(self.step, "dast_report", payload, ext="json")

        parts = [structured("DastReportV1", payload)]
        return env.reply(
            self.ref(), parts, status="BLOCKING_FINDINGS" if blocking else "OK"
        ).model_copy(update={"parts": parts})

    def _triage(self, ctx: Any, payload: dict) -> dict:
        """Ask the security-capability model which findings are actually exploitable."""
        system = ctx.prompts.load(ctx.cfg.step_cfg(self.step).prompt)
        user = (
            "Triage these runtime findings. For each, state exploitability "
            "(confirmed | likely | unlikely | false_positive) and why.\n\n"
            f"```json\n{json.dumps(payload.get('findings', []), indent=2)}\n```\n\n"
            'Return ONLY JSON: {"triage": [{"id":..., "exploitability":..., "reason":...}]}'
        )
        try:
            completion, _ = ctx.router.complete(self.step, system, user)
            return completion.as_json()
        except Exception as exc:  # noqa: BLE001 - triage is advisory, never fatal
            return {"error": str(exc)}


STEP = DastRuntimeSecurity()
