from __future__ import annotations

from pydantic import BaseModel, Field


class Finding(BaseModel):
    id: str
    severity: str            # CRITICAL | HIGH | MEDIUM | LOW | INFO
    title: str
    file: str | None = None
    line: int | None = None
    remediation: str = ""


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
