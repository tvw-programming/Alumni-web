"""Step 14 - Static Code Quality Validation.

Component: TOOL                 Category: Deterministic Quality Gates

No LLM anywhere in this step, on purpose. Compilation, linting, formatting and
architectural rules have exact answers; asking a model to judge them adds cost
and introduces disagreement between runs on identical code.

Failures are rendered to .jpg as well as .json, because the artifact convention
puts errors and visual snapshots in the same class - which means a reviewer sees
lint failures and Playwright screenshots side by side in the dashboard.
"""

from __future__ import annotations

import subprocess
from typing import Any

from ..core.component import Tool
from ..core.envelope import Envelope
from ..core.parts import Modality, blob, structured
from ..tools.screenshot import capture_text_failure


class StaticQualityValidation(Tool):
    step = 14
    name = "static_quality_validation"
    category = "Deterministic Quality Gates"
    consumes = ["CodeChangesetV1", "ProjectContextV1"]
    produces = ["14_static_analysis__{job}__v{v}.json", "14_failure__{job}__v{v}.jpg"]
    accepts = ["application/json"]

    CHECKS = [
        ("compile", ["python", "-m", "compileall", "-q", "."]),
        ("lint", ["ruff", "check", "."]),
        ("format", ["ruff", "format", "--check", "."]),
        ("types", ["mypy", "--ignore-missing-imports", "."]),
    ]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        results, failures = {}, []
        for label, argv in self.CHECKS:
            try:
                proc = subprocess.run(
                    argv, cwd=ctx.workspace, capture_output=True, text=True, timeout=600
                )
                ok = proc.returncode == 0
                results[label] = {"ok": ok, "output": (proc.stdout + proc.stderr)[-3000:]}
                if not ok:
                    failures.append(f"[{label}]\n{results[label]['output']}")
            except FileNotFoundError:
                results[label] = {"ok": True, "skipped": "tool not installed"}
            except subprocess.TimeoutExpired:
                results[label] = {"ok": False, "output": "timed out"}
                failures.append(f"[{label}] timed out")

        results["forbidden_dependencies"] = self._check_forbidden(ctx)
        if not results["forbidden_dependencies"]["ok"]:
            failures.append(str(results["forbidden_dependencies"]["found"]))

        payload = {"checks": results, "passed": not failures}
        ctx.remember("StaticAnalysisV1", payload)
        ctx.artifacts.write(self.step, "static_analysis", payload, ext="json")

        parts = [structured("StaticAnalysisV1", payload)]
        if failures:
            uri = ctx.artifacts.write(
                self.step, "failure", capture_text_failure("\n\n".join(failures)),
                ext="jpg", output_class="error_snapshot", variant="static",
            )
            parts.append(blob(uri, "image/jpeg", Modality.IMAGE, name="static failures"))

        return env.reply(self.ref(), parts, status="OK" if not failures else "FAILED").model_copy(
            update={"parts": parts}
        )

    def _check_forbidden(self, ctx: Any) -> dict:
        forbidden = ctx.cfg.policy.forbidden_dependencies
        if not forbidden:
            return {"ok": True, "found": []}
        found = []
        for name in ("requirements.txt", "pyproject.toml", "package.json"):
            path = ctx.workspace / name
            if path.exists():
                body = path.read_text()
                found += [f for f in forbidden if f.split("<")[0].strip() in body]
        return {"ok": not found, "found": sorted(set(found))}


STEP = StaticQualityValidation()
