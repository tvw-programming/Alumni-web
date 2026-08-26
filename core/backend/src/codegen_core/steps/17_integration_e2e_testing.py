"""Step 17 - Integration / Feature / E2E Testing.

Component: PLUGIN (Playwright)  Category: Behavioural Validation

Unit tests prove the units behave; only this step proves the FEATURE behaves.
It exercises UI -> API -> DB against an ephemeral environment, which is where
integration mistakes that every unit test happily passed finally surface.

Failure screenshots become .jpg artifacts and are linked into the PR, so a human
reviewer sees the actual broken screen rather than a stack trace.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any

from ..core.component import Plugin
from ..core.envelope import Envelope
from ..core.parts import Modality, blob, structured
from ..plugins.factory import build_plugin
from ..tools.screenshot import capture_text_failure, copy_screenshot


class IntegrationE2ETesting(Plugin):
    step = 17
    name = "integration_e2e_testing"
    category = "Behavioural Validation"
    consumes = ["TestDesignV1", "FeatureSpecV1", "CodeChangesetV1"]
    produces = ["17_e2e_report__{job}__v{v}.json", "17_e2e__failure_*__{job}__v{v}.jpg"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        runner = build_plugin(ctx.cfg, "e2e_runner", ctx)
        result = runner.run(ctx.workspace)

        parts_uris: list[str] = []
        for i, shot in enumerate(result.get("screenshots", [])[:8], 1):
            try:
                data = copy_screenshot(Path(shot))
            except OSError:
                continue
            parts_uris.append(
                ctx.artifacts.write(self.step, "e2e", data, ext="jpg",
                                    output_class="error_snapshot", variant=f"failure_{i}")
            )
        if result.get("failures") and not parts_uris:
            text = "\n\n".join(
                f"{f.get('nodeid')}\n{f.get('message', '')[:1200]}" for f in result["failures"][:6]
            )
            parts_uris.append(
                ctx.artifacts.write(self.step, "e2e", capture_text_failure(text), ext="jpg",
                                    output_class="error_snapshot", variant="failure_text")
            )

        payload = {k: v for k, v in result.items() if k != "screenshots"}
        payload["screenshots"] = parts_uris
        ctx.remember("E2EReportV1", payload)
        ctx.artifacts.write(self.step, "e2e_report", payload, ext="json")

        parts = [structured("E2EReportV1", payload)] + [
            blob(u, "image/jpeg", Modality.IMAGE, name="e2e failure") for u in parts_uris
        ]
        ok = payload.get("failed", 0) == 0
        return env.reply(self.ref(), parts, status="OK" if ok else "FAILED").model_copy(
            update={"parts": parts}
        )


STEP = IntegrationE2ETesting()
