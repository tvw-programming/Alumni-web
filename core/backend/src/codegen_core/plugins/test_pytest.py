"""Unit test execution (step 16)."""

from __future__ import annotations

from pathlib import Path

from ..tools.coverage_parse import parse_cobertura, parse_pytest_json
from .base import BasePlugin


class PytestPlugin(BasePlugin):
    capability = "test_runner"
    driver = "pytest"

    DEFAULT = ["pytest", "-q"]

    def _argv(self, report: Path, coverage: Path) -> list[str]:
        """Configured command plus the output flags the orchestrator needs.

        `command` in config chooses how the suite is invoked — a different
        runner, extra markers, a subdirectory. It must not have to know where
        this process wants the machine-readable output written, because those
        paths are decided at runtime. So the report and coverage flags are
        appended here rather than expected from config, and only when the
        configured command has not already supplied them.
        """
        argv = list(getattr(self.cfg, "command", None) or self.DEFAULT)
        joined = " ".join(argv)

        if "--json-report" not in joined:
            argv.append("--json-report")
        if "--json-report-file" not in joined:
            argv.append(f"--json-report-file={report}")

        if "--cov" not in joined:
            argv.append("--cov")
        if "--cov-report" not in joined:
            argv.append(f"--cov-report=xml:{coverage}")

        return argv

    def run(self, workspace: Path) -> dict:
        if self.dry_run:
            return {
                "passed": 12, "failed": 0, "skipped": 0, "duration_s": 3.4,
                "failures": [], "coverage": {"line_pct": 91.2, "uncovered_files": []},
            }

        workspace = Path(workspace)
        report = workspace / ".report.json"
        coverage = workspace / "coverage.xml"
        # Stale output from a previous attempt would be read as this one's result.
        for path in (report, coverage):
            path.unlink(missing_ok=True)

        proc = self._run(self._argv(report, coverage), cwd=workspace, timeout=1800)

        result = parse_pytest_json(report)
        result["coverage"] = parse_cobertura(coverage)
        result["stdout_tail"] = proc.stdout[-4000:]

        # No report at all means the runner never started — a missing plugin, a
        # bad command. That is a failure, not a suite with zero tests.
        if not report.exists():
            result["failed"] = max(result.get("failed", 0), 1)
            result["failures"] = [
                {
                    "nodeid": "pytest",
                    "message": "pytest produced no JSON report. "
                    f"exit={proc.returncode}\n{(proc.stderr or proc.stdout)[-1500:]}",
                }
            ]
        return result
