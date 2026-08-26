"""Step 22 - Create Pull Request.

Component: PLUGIN (GitHub)      Category: VCS Publication

The PR body is the audit package: it links every artifact the pipeline produced,
so a human reviewer at step 24 can trace any line of code back through the TDD,
the spec, the impact manifest, the BRD, and finally the Jira story - without
leaving the PR.

The PR opens as a draft. It becomes a merge candidate only after gate 24.
"""

from __future__ import annotations

import re
from typing import Any

from ..core.component import Plugin
from ..core.envelope import Envelope
from ..core.parts import structured
from ..plugins.factory import build_plugin


def slugify(text: str, limit: int = 40) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:limit]


class PullRequestCreation(Plugin):
    step = 22
    name = "pull_request_creation"
    category = "VCS Publication"
    consumes = ["BrdV1", "TechnicalDesignV1", "CodeChangesetV1", "TestReportV1", "AiReviewV1"]
    produces = ["22_pull_request__{job}__v{v}.json"]
    accepts = ["application/json"]

    def handle(self, env: Envelope, ctx: Any) -> Envelope:
        vcs = build_plugin(ctx.cfg, "vcs", ctx)
        brd = ctx.recall("BrdV1") or {}
        title = f"{ctx.jira_id}: {brd.get('title', 'change')}"
        branch = vcs.branch_name(ctx.jira_id, slugify(brd.get("title", "change")))

        pr = vcs.open_pull_request(title=title, body=self._body(ctx, brd), head=branch)
        ctx.remember("PullRequestV1", pr)
        ctx.artifacts.write(self.step, "pull_request", pr, ext="json")
        return env.reply(self.ref(), [structured("PullRequestV1", pr)])

    def _body(self, ctx: Any, brd: dict) -> str:
        tests = ctx.recall("TestReportV1") or {}
        coverage = tests.get("coverage", {})
        security = ctx.recall("SecurityScanV1") or {}
        coverage_report = ctx.recall("RequirementCoverageV1") or {}
        artifacts = "\n".join(
            f"- `{e['file']}` ({e['output_class']}, {e['bytes']} bytes)"
            for e in ctx.artifacts.index()
        )
        acs = "\n".join(f"- **{a['id']}** {a['text']}" for a in brd.get("acceptance_criteria", []))
        return (
            f"## {brd.get('title', '')}\n\n"
            f"**Jira:** {ctx.jira_id}\n"
            f"**Job:** `{ctx.job_id}`\n"
            f"**Profile:** `{ctx.cfg.active_profile}`\n\n"
            f"### Acceptance Criteria\n{acs or '- (none)'}\n\n"
            f"### Verification\n"
            f"- Requirement coverage: {coverage_report.get('verdict', 'n/a')} "
            f"(missing: {coverage_report.get('missing', [])})\n"
            f"- Unit tests: {tests.get('passed', 0)} passed / {tests.get('failed', 0)} failed\n"
            f"- Line coverage: {coverage.get('line_pct', 0)}% "
            f"(changed lines: {coverage.get('changed_line_pct', 0)}%)\n"
            f"- Blocking security findings: {len(security.get('blocking_findings', []))}\n"
            f"- Total model cost: ${ctx.journal.total_cost_usd()}\n\n"
            f"### Artifacts\n{artifacts}\n\n"
            "### Reviewer checklist\n"
            "- [ ] The change matches the approved BRD, and nothing more\n"
            "- [ ] Tests assert intended behaviour rather than current behaviour\n"
            "- [ ] Security findings are resolved or explicitly accepted\n"
            "- [ ] Documentation reflects the shipped implementation\n"
        )


STEP = PullRequestCreation()
