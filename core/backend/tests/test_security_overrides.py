"""The audited path for accepting a blocking security finding.

Step 18 stops the run on a CRITICAL or HIGH finding and gate 24 will not open
while one is outstanding. These tests cover the only sanctioned way past that:
a named role waiving one named occurrence, with a reason, in this job only.

What they are really defending is the *identity* of a waiver. No scanner emits a
per-occurrence id — gitleaks reports the rule name, so `private-key` is the id of
every private key in the tree — and a waiver keyed on that would excuse findings
nobody has ever looked at.
"""

from __future__ import annotations

import pytest

from codegen_core.orchestrator.overrides import (
    OverrideService,
    partition,
    waived_refs,
)
from codegen_core.schemas.security import Finding, finding_ref


def _secret(line: int, file: str = "app/services/exporter.py") -> dict:
    """A gitleaks-shaped finding: the id is the *rule*, not the occurrence."""
    return {
        "id": "private-key",
        "severity": "CRITICAL",
        "title": "potential secret: private key",
        "file": file,
        "line": line,
        "remediation": "rotate the credential and move it to the secret manager",
    }


def _write_reports(ctx, findings: list[dict], scanner: str = "gitleaks") -> None:
    """Put a step-18 report on disk, which is where waivers are checked against."""
    ctx.artifacts.write(
        18, "secrets", {"scanner": scanner, "findings": findings}, ext="json"
    )


# --------------------------------------------------------------------------- #
# identity
# --------------------------------------------------------------------------- #
def test_two_secrets_under_one_rule_are_different_findings():
    """The test the whole design turns on.

    gitleaks gives both of these the id `private-key`. If a waiver were keyed on
    the id, accepting the first would silently accept the second — and every
    private key committed afterwards.
    """
    first = finding_ref("gitleaks", Finding(**_secret(24)))
    second = finding_ref("gitleaks", Finding(**_secret(91)))

    assert first != second


def test_the_same_occurrence_refs_the_same_way():
    """A ref has to survive a re-scan, or no waiver would ever be honoured."""
    assert finding_ref("gitleaks", Finding(**_secret(24))) == finding_ref(
        "gitleaks", Finding(**_secret(24))
    )


def test_moving_the_code_lapses_the_waiver():
    """Fails closed. The finding blocks again and someone has to look at it."""
    before = finding_ref("gitleaks", Finding(**_secret(24)))
    after = finding_ref("gitleaks", Finding(**_secret(31)))

    assert before != after


def test_the_same_rule_in_another_file_is_another_finding():
    assert finding_ref("gitleaks", Finding(**_secret(24))) != finding_ref(
        "gitleaks", Finding(**_secret(24, file="app/services/importer.py"))
    )


def test_two_scanners_reporting_one_line_stay_distinct():
    """Waiving semgrep's view of a line must not waive gitleaks' view of it."""
    assert finding_ref("gitleaks", Finding(**_secret(24))) != finding_ref(
        "semgrep", Finding(**_secret(24))
    )


# --------------------------------------------------------------------------- #
# who may waive, and on what terms
# --------------------------------------------------------------------------- #
def test_a_role_that_is_not_allowed_cannot_waive(ctx):
    _write_reports(ctx, [_secret(24)])
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    with pytest.raises(PermissionError, match="senior_engineer"):
        OverrideService(ctx.cfg).waive(
            ctx, [ref], "sam.k", "senior_engineer", "looks fine to me"
        )

    assert waived_refs(ctx.journal) == set(), "a refused waiver must leave no record"


def test_a_waiver_needs_a_justification(ctx):
    _write_reports(ctx, [_secret(24)])
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    with pytest.raises(ValueError, match="justification"):
        OverrideService(ctx.cfg).waive(ctx, [ref], "dana.o", "security_owner", "   ")

    assert waived_refs(ctx.journal) == set()


def test_a_ref_that_matches_nothing_is_refused(ctx):
    """Silence here would read as permission granted while the run stays blocked."""
    _write_reports(ctx, [_secret(24)])

    with pytest.raises(ValueError, match="no open blocking finding"):
        OverrideService(ctx.cfg).waive(
            ctx, ["deadbeefdeadbeef"], "dana.o", "security_owner", "not reachable"
        )


def test_a_waiver_records_who_what_and_why(ctx):
    _write_reports(ctx, [_secret(24)])
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    OverrideService(ctx.cfg).waive(
        ctx, [ref], "dana.o", "security_owner", "test fixture key, rotated 2026-09-01"
    )

    record = next(
        e for e in ctx.journal.entries() if e.get("event") == "finding_override"
    )
    assert record["ref"] == ref
    assert record["approver_id"] == "dana.o"
    assert record["role"] == "security_owner"
    assert record["justification"] == "test fixture key, rotated 2026-09-01"
    # The finding travels with the record: reading the journal later should not
    # require reconstructing which artifact this hash came from.
    assert record["severity"] == "CRITICAL"
    assert record["file"] == "app/services/exporter.py"
    assert record["line"] == 24


def test_only_the_named_finding_is_waived(ctx):
    """Two secrets, one rule, one waiver. The other one still blocks."""
    _write_reports(ctx, [_secret(24), _secret(91)])
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    result = OverrideService(ctx.cfg).waive(
        ctx, [ref], "dana.o", "security_owner", "fixture key"
    )

    assert [f["line"] for f in result["waived"]] == [24]
    assert [f["line"] for f in result["remaining"]] == [91]


# --------------------------------------------------------------------------- #
# what a waiver does to the block
# --------------------------------------------------------------------------- #
def test_partition_splits_on_the_waived_ref():
    findings = [_secret(24), _secret(91)]
    waived = {finding_ref("gitleaks", Finding(**_secret(24)))}

    blocking, excused = partition(findings, "gitleaks", waived)

    assert [f["line"] for f in blocking] == [91]
    assert [f["line"] for f in excused] == [24]


def test_partition_stamps_the_scanner_onto_each_finding():
    """Gate 24 re-derives the ref from these dicts, so they carry their scanner."""
    blocking, _ = partition([_secret(24)], "gitleaks", set())

    assert blocking[0]["scanner"] == "gitleaks"
    assert blocking[0]["ref"] == finding_ref("gitleaks", Finding(**_secret(24)))


def test_a_waiver_is_scoped_to_its_job(cfg, ctx):
    """The journal is per job, which is what makes 'no expiry' safe."""
    from codegen_core.core.context import JobContext

    _write_reports(ctx, [_secret(24)])
    ref = finding_ref("gitleaks", Finding(**_secret(24)))
    OverrideService(cfg).waive(ctx, [ref], "dana.o", "security_owner", "fixture key")

    other = JobContext.create(cfg, "DEEP-2000")

    assert ref in waived_refs(ctx.journal)
    assert waived_refs(other.journal) == set(), "a waiver must not cross runs"


def test_open_findings_ignore_everything_below_the_blocking_severity(ctx):
    low = {**_secret(24), "severity": "LOW"}
    _write_reports(ctx, [low, _secret(91)])

    findings = OverrideService(ctx.cfg).open_findings(ctx)

    assert [f["line"] for f in findings] == [91]


def test_no_allowed_roles_means_nobody_may_waive(cfg, ctx, monkeypatch):
    """A deployment that never configures this keeps the hard block it has now."""
    from codegen_core.core.config import OverrideCfg

    _write_reports(ctx, [_secret(24)])
    ref = finding_ref("gitleaks", Finding(**_secret(24)))
    # The config models are frozen, so the empty default is substituted at the
    # accessor rather than by mutating a loaded config.
    monkeypatch.setattr(
        type(ctx.policy), "override_cfg", lambda self: OverrideCfg(), raising=True
    )

    with pytest.raises(PermissionError, match="allowed_roles"):
        OverrideService(cfg).waive(ctx, [ref], "dana.o", "security_owner", "why not")


# --------------------------------------------------------------------------- #
# the wire
# --------------------------------------------------------------------------- #
fastapi = pytest.importorskip("fastapi", reason="dashboard extra not installed")
from fastapi.testclient import TestClient  # noqa: E402

from codegen_core.dashboard.api import create_app  # noqa: E402
from codegen_core.orchestrator.runner import PipelineRunner  # noqa: E402


@pytest.fixture
def api(cfg, ctx, monkeypatch):
    """A finished run, a blocking finding on disk, and a client over both."""
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    PipelineRunner(cfg).run(ctx)
    _write_reports(ctx, [_secret(24), _secret(91)])
    monkeypatch.setattr(
        "codegen_core.dashboard.api.ConfigLoader.load", lambda *a, **k: cfg
    )
    return TestClient(create_app()), ctx


def test_findings_endpoint_hands_back_refs_and_the_waiver_terms(api):
    client, ctx = api

    body = client.get(f"/api/runs/{ctx.job_id}/security/findings").json()

    assert [f["line"] for f in body["findings"]] == [24, 91]
    assert all(len(f["ref"]) == 16 for f in body["findings"])
    assert body["waived"] == []
    # The UI needs to know who may sign before it offers the control.
    assert body["policy"]["allowedRoles"] == ["security_owner"]
    assert body["policy"]["requiresJustification"] is True


def test_the_wrong_role_is_refused_with_403(api):
    client, ctx = api
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    response = client.post(
        f"/api/runs/{ctx.job_id}/security/override",
        json={"refs": [ref], "role": "senior_engineer", "justification": "fine by me"},
    )

    assert response.status_code == 403
    assert "security_owner" in response.json()["detail"]


def test_a_missing_justification_is_refused_with_422(api):
    client, ctx = api
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    response = client.post(
        f"/api/runs/{ctx.job_id}/security/override",
        json={"refs": [ref], "role": "security_owner", "justification": ""},
    )

    assert response.status_code == 422


def test_a_waiver_over_the_wire_lands_in_the_journal(api):
    client, ctx = api
    ref = finding_ref("gitleaks", Finding(**_secret(24)))

    body = client.post(
        f"/api/runs/{ctx.job_id}/security/override",
        json={
            "refs": [ref],
            "role": "security_owner",
            "justification": "fixture key, rotated",
            "requestedBy": "dana.o",
        },
    ).json()

    assert [f["line"] for f in body["waived"]] == [24]
    assert [f["line"] for f in body["remaining"]] == [91]
    # One finding is still blocking, so the message must not suggest otherwise.
    assert "still blocking" in body["message"]
    assert ref in {
        e.get("ref") for e in ctx.journal.entries() if e.get("event") == "finding_override"
    }


def test_waiving_the_last_finding_says_the_run_can_continue(api):
    client, ctx = api
    refs = [
        finding_ref("gitleaks", Finding(**_secret(24))),
        finding_ref("gitleaks", Finding(**_secret(91))),
    ]

    body = client.post(
        f"/api/runs/{ctx.job_id}/security/override",
        json={"refs": refs, "role": "security_owner", "justification": "both accepted"},
    ).json()

    assert body["remaining"] == []
    assert "Retry step 18" in body["message"]


# --------------------------------------------------------------------------- #
# end to end: block, waive, clear
# --------------------------------------------------------------------------- #
def test_a_waiver_turns_a_blocked_step_18_into_a_clear_one(cfg, ctx, monkeypatch):
    """The whole point, proved through the step rather than through its parts.

    Step 18 blocks on a committed secret, the finding is waived, the step runs
    again and now passes — while the finding itself is still reported. Nothing
    about the code changed, which is exactly what a waiver claims is acceptable.
    """
    from codegen_core.core.envelope import ComponentRef, Envelope, Intent
    from codegen_core.plugins.secrets_gitleaks import GitleaksPlugin
    from codegen_core.steps._loader import load_steps

    monkeypatch.setattr(
        GitleaksPlugin,
        "scan",
        lambda self, workspace: {"scanner": "gitleaks", "findings": [_secret(24)]},
    )
    step18 = load_steps(cfg)[18]
    env = Envelope(
        correlation_id="c",
        sender=ComponentRef(name="runner", kind="orchestrator"),
        recipient=ComponentRef(step=18, name=step18.name, kind="plugin"),
        intent=Intent.REQUEST,
    )

    blocked = step18.handle(env, ctx)
    assert blocked.status == "BLOCKING_FINDINGS"

    ref = finding_ref("gitleaks", Finding(**_secret(24)))
    OverrideService(cfg).waive(ctx, [ref], "dana.o", "security_owner", "fixture key")

    cleared = step18.handle(env, ctx)
    assert cleared.status == "OK"

    payload = cleared.json_part("SecurityScanV1")
    assert payload["blocking_findings"] == []
    # Still found, still reported — it simply no longer stops the run.
    assert [f["line"] for f in payload["waived_findings"]] == [24]
    assert payload["reports"]["secrets"]["findings"][0]["line"] == 24


def test_gate_24_opens_once_the_finding_is_waived(cfg, ctx):
    """The gate reaches the same verdict however late the waiver was signed."""
    from codegen_core.schemas.security import finding_ref as ref_of

    ref = ref_of("gitleaks", Finding(**_secret(24)))
    # A payload as step 18 wrote it *before* anyone waived anything.
    stale = {**_secret(24), "scanner": "gitleaks", "ref": ref}
    ctx.remember("SecurityScanV1", {"reports": {}, "blocking_findings": [stale]})
    _write_reports(ctx, [_secret(24)])

    assert cfg.gates["24"].block_if_open_findings is True

    OverrideService(cfg).waive(ctx, [ref], "dana.o", "security_owner", "fixture key")

    waived = waived_refs(ctx.journal)
    remaining = [
        f
        for f in ctx.recall("SecurityScanV1")["blocking_findings"]
        if ref_of(f.get("scanner", ""), f) not in waived
    ]
    assert remaining == [], "gate 24 would still refuse to open"
