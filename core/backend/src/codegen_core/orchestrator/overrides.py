"""Waiving a blocking security finding, on the record.

Step 18 stops the run on a CRITICAL or HIGH finding and gate 24 refuses to open
while one is outstanding. That is the right default and it is not negotiable by
config — but "the scanner is right and we are shipping anyway" is a real and
legitimate answer: a confirmed false positive, or a CVE in a code path this
service never reaches.

Before this module the only way to say that was to edit `block_on_severity`,
which is global, silent, and turns the check off for every future run rather
than excusing one finding in one run. A waiver here is the opposite on all three
counts: it names a single occurrence, it carries a reason and a signatory, and
it lives in the append-only journal, which makes it a decision somebody made
rather than a setting somebody changed.

Two properties do the work:

**Scope.** The journal is per job, so a waiver dies with the run that granted
it. Nothing is suppressed for tomorrow, and a later run of the same story scans
the same code and blocks again.

**Identity.** A waiver names one occurrence via `finding_ref` — scanner, rule,
file and line — never a rule. See that function for why the distinction matters:
gitleaks reports `private-key` as the id of *every* private key in the tree.
"""

from __future__ import annotations

from typing import Any

from ..schemas.security import SastReportV1, finding_ref

#: Journal event kind. One record per waived finding.
WAIVER_EVENT = "finding_override"

#: The step whose findings may be waived. 19 blocks the same way and could join
#: it, but its findings are runtime evidence and are out of scope here.
SECURITY_STEP = 18


class OverrideService:
    """Grants waivers and reports which ones are in force.

    Errors mirror `GateService.decide`, the other place a human decision is
    recorded against a role: `PermissionError` when the role may not act,
    `ValueError` when the request itself does not make sense.
    """

    def __init__(self, cfg: Any) -> None:
        self.cfg = cfg

    # ------------------------------------------------------------------ #
    def open_findings(self, ctx: Any) -> list[dict]:
        """Blocking findings from step 18's reports, each carrying its ref.

        Read from the artifacts rather than from `ctx.recall`, because the two
        callers do not share a process: the run has the payload in memory, and
        the dashboard API has only what is on disk. The artifacts are what both
        of them can agree on.
        """
        severities = ctx.policy.blocking_severities()
        findings: list[dict] = []

        for uri in ctx.artifacts.of_step(SECURITY_STEP):
            if not uri.endswith(".json"):
                continue
            try:
                report = SastReportV1.model_validate(ctx.artifacts.read_json(uri))
            except (OSError, ValueError):
                # A report that will not parse is not evidence of anything; the
                # scan itself is what decides the block, not this listing.
                continue
            for finding in report.blocking(severities):
                data = finding.model_dump(mode="json")
                data["scanner"] = report.scanner
                data["ref"] = finding_ref(report.scanner, finding)
                findings.append(data)

        return findings

    # ------------------------------------------------------------------ #
    def waive(
        self,
        ctx: Any,
        refs: list[str],
        approver_id: str,
        role: str,
        justification: str = "",
    ) -> dict:
        """Record a waiver for one or more open findings.

        Refuses a ref that does not match an open blocking finding. A waiver
        that silently matches nothing is worse than an error: it reads as
        permission granted while the run stays blocked for reasons nobody can
        see.
        """
        cfg = ctx.policy.override_cfg()

        if not cfg.allowed_roles:
            raise PermissionError(
                "no role may waive a security finding: policy.override.allowed_roles "
                "is empty. Fix the finding, or configure who is allowed to accept it."
            )
        if role not in cfg.allowed_roles:
            raise PermissionError(
                f"role '{role}' cannot waive a security finding; "
                f"needs one of {cfg.allowed_roles}"
            )
        if cfg.requires_justification and not justification.strip():
            raise ValueError(
                "a waiver needs a justification: it is the only part of the record "
                "that says why this finding was accepted."
            )
        if not refs:
            raise ValueError("no findings named; a waiver has to say what it waives")

        by_ref = {f["ref"]: f for f in self.open_findings(ctx)}
        unknown = [r for r in refs if r not in by_ref]
        if unknown:
            raise ValueError(
                f"no open blocking finding matches {', '.join(sorted(unknown))}. "
                "A finding is identified by scanner, rule, file and line, so a ref "
                "stops matching once the code moves — re-read the findings and "
                "waive the one that is actually open."
            )

        waived = []
        for ref in dict.fromkeys(refs):  # de-duplicated, order preserved
            finding = by_ref[ref]
            # The finding is copied into the record rather than referenced: a
            # reader of the journal in six months should not have to reconstruct
            # which artifact this hash came from.
            ctx.journal.append_event(
                WAIVER_EVENT,
                step=SECURITY_STEP,
                ref=ref,
                scanner=finding.get("scanner", ""),
                finding_id=finding.get("id", ""),
                severity=finding.get("severity", ""),
                title=finding.get("title", ""),
                file=finding.get("file"),
                line=finding.get("line"),
                approver_id=approver_id,
                role=role,
                justification=justification.strip(),
            )
            waived.append(finding)

        return {
            "waived": waived,
            "remaining": [f for f in self.open_findings(ctx) if f["ref"] not in refs],
        }


# --------------------------------------------------------------------------- #
def waived_refs(journal: Any) -> set[str]:
    """Refs waived in this job. The journal is per job, so this is job-scoped."""
    return {
        entry["ref"]
        for entry in journal.entries()
        if entry.get("event") == WAIVER_EVENT and entry.get("ref")
    }


def partition(findings: list[dict], scanner: str, waived: set[str]) -> tuple[list, list]:
    """Split findings into (still blocking, waived), by ref.

    Takes the scanner separately because a `Finding` does not carry the name of
    the tool that produced it — the report does — and stamps it onto each
    finding on the way out, along with the ref. Everything downstream (gate 24,
    the waiver artifact, the API) then reads one self-describing shape instead
    of having to remember which report a finding came out of.
    """
    blocking, excused = [], []
    for finding in findings:
        ref = finding_ref(scanner, finding)
        enriched = {**finding, "scanner": scanner, "ref": ref}
        (excused if ref in waived else blocking).append(enriched)
    return blocking, excused
