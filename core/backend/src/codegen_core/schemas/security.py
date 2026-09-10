from __future__ import annotations

import hashlib

from pydantic import BaseModel, Field


class Finding(BaseModel):
    id: str
    severity: str            # CRITICAL | HIGH | MEDIUM | LOW | INFO
    title: str
    file: str | None = None
    line: int | None = None
    remediation: str = ""


def finding_ref(scanner: str, finding: Finding | dict) -> str:
    """A stable identity for one *occurrence* of a finding.

    None of the three scanners emits a per-occurrence id. trivy reports the CVE,
    semgrep the rule's `check_id`, and gitleaks the rule name — so `private-key`
    is the id of every private key in the repository, not of one of them. Keying
    a waiver on the id alone would therefore waive a class of finding, including
    occurrences introduced after the waiver was signed.

    Scanner, rule, file and line together name a single occurrence. The line is
    what separates two secrets caught by one gitleaks rule, and it is also what
    makes this fail closed: move the code and the waiver stops matching, so the
    finding blocks again and has to be waived a second time by someone who can
    see where it went.

    Not to be confused with the runner's step *input* fingerprint, which hashes
    a step's inputs to decide whether it can be skipped.
    """
    data = finding if isinstance(finding, dict) else finding.model_dump()
    parts = [
        scanner,
        str(data.get("id") or ""),
        str(data.get("file") or ""),
        "" if data.get("line") is None else str(data["line"]),
    ]
    return hashlib.sha256("|".join(parts).encode()).hexdigest()[:16]


class SastReportV1(BaseModel):
    """Step 18: static analysis, dependency scan, secrets detection."""

    scanner: str = ""
    findings: list[Finding] = Field(default_factory=list)

    def blocking(self, severities: list[str]) -> list[Finding]:
        return [f for f in self.findings if f.severity in severities]


class DastReportV1(BaseModel):
    """Step 19: runtime testing against a deployed instance."""

    target: str = ""
    scanner: str = ""
    findings: list[Finding] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)

    def blocking(self, severities: list[str]) -> list[Finding]:
        return [f for f in self.findings if f.severity in severities]
