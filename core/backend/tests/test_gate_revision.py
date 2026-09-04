"""Answering a rejected BRD gate with a replacement document.

The property under test is the one the gate exists for: after a rejection,
nothing implementation-related runs, and what unblocks the run is a document a
human supplied — bound to its own checksum, parsed into the contract the rest
of the pipeline traces against, and decided on its own merits.
"""

import base64
import json

import pytest

from codegen_core.core.errors import DocumentRejected, PipelineHalted, RevisionNotAllowed
from codegen_core.orchestrator.gates import GateService
from codegen_core.orchestrator.runner import PipelineRunner
from codegen_core.plugins.factory import build_plugin
from codegen_core.tools.brd_parse import parse_brd_markdown

REPLACEMENT = """
# Business Requirement Document

## Two-factor enrolment for the admin console

### Background
The reviewer rewrote this section by hand.

### Objectives
- Reduce account takeover on privileged accounts

### In Scope
- Enrolment flow

### Out of Scope
- SMS as a second factor

### Acceptance Criteria
- **AC-1** An admin without a second factor is prompted to enrol at sign-in
- **AC-2** Recovery codes are issued once and shown once

### Risks
- Lockout if recovery codes are lost

### Assumptions
- Every admin has a registered device
"""


def encode(text: str) -> str:
    return base64.b64encode(text.encode()).decode()


@pytest.fixture
def rejected(cfg, ctx, monkeypatch):
    """A run stopped at gate 06 with the BRD rejected."""
    monkeypatch.delenv("CODEGEN_AUTO_APPROVE", raising=False)
    PipelineRunner(cfg).run(ctx, stop=5)
    build_plugin(cfg, "dashboard", ctx).open_gate(ctx, 6, ctx.artifacts.of_step(5), cfg.gates["06"])
    GateService(cfg).decide(ctx, 6, "REJECTED", "priya.raman", "product_owner", "Scope is wrong")
    return ctx


@pytest.fixture
def client(cfg, monkeypatch):
    pytest.importorskip("fastapi", reason="dashboard extra not installed")
    from fastapi.testclient import TestClient

    from codegen_core.dashboard.api import create_app

    monkeypatch.setattr("codegen_core.dashboard.api.ConfigLoader.load", lambda *a, **k: cfg)
    return TestClient(create_app())


def revise(cfg, ctx, text=REPLACEMENT, filename="brd.md", role="product_owner"):
    return GateService(cfg).revise(
        ctx, 6, filename=filename, data=text.encode(),
        uploaded_by="priya.raman", uploaded_role=role, comment="Rewrote the scope",
    )


# --------------------------------------------------------------------------- #
# the run stops, and stays stopped
# --------------------------------------------------------------------------- #
def test_a_rejected_brd_halts_the_run_instead_of_regenerating(cfg, rejected):
    """No remediation edge: the same inputs would produce the same document."""
    result = PipelineRunner(cfg).run(rejected, start=6)

    assert result.ok is False
    assert result.halted_at == 6
    assert "rejected" in result.reason.lower()
    assert "replacement" in result.reason

    ran = {e["step"] for e in rejected.journal.entries() if e.get("type") == "step"}
    assert not ran & set(range(7, 25)), "nothing past the gate may run on a rejected BRD"


def test_resume_returns_to_the_rejected_gate_rather_than_past_it(cfg, rejected):
    """`last step + 1` would be step 07 — implementation, on an unapproved BRD."""
    PipelineRunner(cfg).run(rejected, start=6)
    assert PipelineRunner(cfg).resume_point(rejected) == 6


def test_a_rejected_gate_refuses_a_second_decision(cfg, rejected):
    with pytest.raises(RevisionNotAllowed, match="waiting for a replacement"):
        GateService(cfg).decide(rejected, 6, "APPROVED", "priya.raman", "product_owner")


# --------------------------------------------------------------------------- #
# replacing the document
# --------------------------------------------------------------------------- #
def test_the_replacement_supersedes_the_generated_brd(cfg, rejected):
    original = rejected.artifacts.of_step(5)
    record = revise(cfg, rejected)

    live = rejected.artifacts.of_step(5)
    assert set(live).isdisjoint(original), "the generated BRD is no longer the live one"
    assert record["file"] in live[0] or any(record["file"] in uri for uri in live)

    # Superseded, not deleted: the bytes a reviewer rejected stay auditable.
    everything = rejected.artifacts.of_step(5, include_superseded=True)
    assert set(original) <= set(everything)
    index = {e["file"]: e for e in rejected.artifacts.index()}
    assert all(index[u.rsplit("/", 1)[-1]]["source"] == "human_upload" for u in live)


def test_the_replacement_becomes_the_typed_contract_downstream_reads(cfg, rejected):
    revise(cfg, rejected)

    brd = rejected.recall("BrdV1")
    assert brd["title"] == "Two-factor enrolment for the admin console"
    assert [c["id"] for c in brd["acceptance_criteria"]] == ["AC-1", "AC-2"]

    # And it survives into a fresh process, which is what actually resumes a run.
    reloaded = PipelineRunner(cfg)
    reloaded.rehydrate(rejected)
    assert reloaded is not None
    stored = rejected.recall("BrdV1")
    assert stored["acceptance_criteria"][0]["text"].startswith("An admin without")


def test_the_gate_reopens_bound_to_the_new_checksum(cfg, rejected):
    revise(cfg, rejected)
    dash = build_plugin(cfg, "dashboard", rejected)

    assert dash.last_decision(rejected, 6) is None, "the rejection was archived, not left standing"
    request = dash.request(rejected, 6)
    shas = request["artifact_sha256"]
    assert shas, "the re-opened gate binds to the document under it"
    assert set(shas) == set(rejected.artifacts.of_step(5))
    assert dash.pending(rejected), "the gate is waiting on a human again"

    # The archived rejection is still on disk for the audit trail.
    archived = list((rejected.journal.root / "gates").glob("06_decision__*.json"))
    assert len(archived) == 1
    assert json.loads(archived[0].read_text())["status"] == "REJECTED"


def test_approving_the_replacement_lets_the_run_continue(cfg, rejected):
    PipelineRunner(cfg).run(rejected, start=6)  # halts
    revise(cfg, rejected)
    GateService(cfg).decide(rejected, 6, "APPROVED", "priya.raman", "product_owner", "Better")

    runner = PipelineRunner(cfg)
    result = runner.run(rejected, start=runner.resume_point(rejected), stop=7)
    assert result.ok

    approvals = [e for e in rejected.journal.entries() if e.get("type") == "approval"]
    assert [a["status"] for a in approvals] == ["REJECTED", "APPROVED"]
    # The signature is over the human's document, not the one that was rejected.
    live = {rejected.artifacts.sha_of(u) for u in rejected.artifacts.of_step(5)}
    assert approvals[-1]["artifact_sha256"] in live


def test_replacements_are_bounded_like_every_other_loop(cfg, rejected):
    service = GateService(cfg)
    for round_ in range(cfg.gates["06"].revision.max_revisions):
        revise(cfg, rejected, REPLACEMENT.replace("AC-1", f"AC-{round_ + 10}"))
        service.decide(rejected, 6, "REJECTED", "priya.raman", "product_owner", "still wrong")

    with pytest.raises(RevisionNotAllowed, match="configured limit"):
        revise(cfg, rejected)


# --------------------------------------------------------------------------- #
# what the gate refuses
# --------------------------------------------------------------------------- #
def test_a_document_with_no_acceptance_criteria_is_refused(cfg, rejected):
    with pytest.raises(DocumentRejected, match="acceptance criteria"):
        revise(cfg, rejected, "# BRD\n\n## A title\n\n### Background\nnothing else\n")


def test_an_unreadable_extension_is_refused(cfg, rejected):
    with pytest.raises(DocumentRejected, match="not accepted here"):
        revise(cfg, rejected, REPLACEMENT, filename="brd.rtf")


def test_an_oversized_document_is_refused(cfg, rejected):
    with pytest.raises(DocumentRejected, match="at most"):
        revise(cfg, rejected, "x" * (cfg.gates["06"].revision.max_bytes + 1))


def test_only_a_role_the_gate_accepts_may_replace_the_document(cfg, rejected):
    with pytest.raises(PermissionError, match="cannot replace"):
        revise(cfg, rejected, role="intern")


def test_a_document_cannot_be_swapped_under_an_approved_gate(cfg, ctx, monkeypatch):
    monkeypatch.delenv("CODEGEN_AUTO_APPROVE", raising=False)
    PipelineRunner(cfg).run(ctx, stop=5)
    build_plugin(cfg, "dashboard", ctx).open_gate(ctx, 6, ctx.artifacts.of_step(5), cfg.gates["06"])
    GateService(cfg).decide(ctx, 6, "APPROVED", "priya.raman", "product_owner")

    with pytest.raises(RevisionNotAllowed, match="not waiting for a replacement"):
        revise(cfg, ctx)


def test_gate_24_does_not_offer_a_revision_path(cfg, ctx):
    """Only gates that declare one accept a document; the merge gate does not."""
    assert GateService(cfg).revision_state(ctx, 24) is None


# --------------------------------------------------------------------------- #
# the wire format the dashboard drives
# --------------------------------------------------------------------------- #
def test_the_rejected_gate_advertises_the_way_forward(client, rejected):
    gate = next(s for s in client.get(f"/api/runs/{rejected.job_id}").json()["steps"] if s["step"] == 6)

    assert gate["status"] == "REJECTED"
    assert gate["revision"]["required"] is True
    assert gate["revision"]["replacesStep"] == 5
    assert "md" in gate["revision"]["acceptedExtensions"]
    assert gate["revision"]["revisionsUsed"] == 0


def test_uploading_through_the_api_reopens_the_gate(client, rejected):
    response = client.post(
        f"/api/runs/{rejected.job_id}/steps/6/revision",
        json={
            "filename": "brd-v2.md",
            "contentBase64": encode(REPLACEMENT),
            "uploadedBy": "priya.raman",
            "uploadedRole": "product_owner",
            "comment": "Rewrote the scope",
        },
    )
    assert response.status_code == 200, response.json()
    body = response.json()

    gate = next(s for s in body["run"]["steps"] if s["step"] == 6)
    assert gate["status"] == "AWAITING_APPROVAL", "the gate asks again, against the new document"
    assert gate["revision"]["required"] is False
    assert gate["revision"]["revisionsUsed"] == 1
    assert gate["revision"]["lastRevision"]["uploadedBy"] == "priya.raman"
    assert gate["approval"]["supersededByRevision"] is True

    # The reviewer is shown the document they uploaded, not the one they rejected.
    review = gate["reviewArtifacts"]
    assert review and not any(a["superseded"] for a in review)
    assert all(a["source"] == "human_upload" for a in review)
    assert body["run"]["status"] == "AWAITING_APPROVAL"

    brd = next(s for s in body["run"]["steps"] if s["step"] == 5)
    assert brd["output"]["title"] == "Two-factor enrolment for the admin console"


def test_the_api_refuses_a_document_it_cannot_parse(client, rejected):
    response = client.post(
        f"/api/runs/{rejected.job_id}/steps/6/revision",
        json={
            "filename": "brd.md",
            "contentBase64": encode("just some prose with no structure at all"),
            "uploadedBy": "priya.raman",
            "uploadedRole": "product_owner",
        },
    )
    assert response.status_code == 422
    assert "acceptance criteria" in response.json()["detail"]


def test_the_api_refuses_a_decision_while_a_document_is_owed(client, rejected):
    response = client.post(
        f"/api/runs/{rejected.job_id}/steps/6/decision",
        json={"status": "APPROVED", "approverId": "priya.raman", "approverRole": "product_owner"},
    )
    assert response.status_code == 409


def test_the_merge_gate_has_no_revision_endpoint(client, rejected):
    response = client.post(
        f"/api/runs/{rejected.job_id}/steps/24/revision",
        json={
            "filename": "pr.md",
            "contentBase64": encode(REPLACEMENT),
            "uploadedBy": "sam",
            "uploadedRole": "senior_engineer",
        },
    )
    assert response.status_code == 404


# --------------------------------------------------------------------------- #
# the parser
# --------------------------------------------------------------------------- #
def test_round_trips_the_document_step_05_renders(cfg, ctx):
    from codegen_core.schemas.brd import AcceptanceCriterion, BrdV1

    original = BrdV1(
        title="Rate limit the export endpoint",
        background="Exports are unbounded.",
        objectives=["Cap concurrent exports"],
        scope_in=["/api/export"],
        scope_out=["The bulk importer"],
        acceptance_criteria=[
            AcceptanceCriterion(id="AC-1", text="A sixth concurrent export is rejected"),
            AcceptanceCriterion(id="AC-2", text="The limit is configurable"),
        ],
        risks=["Long exports may be cut short"],
        assumptions=["Exports are idempotent"],
    )
    parsed = parse_brd_markdown(original.as_markdown()).brd

    assert parsed.title == original.title
    assert parsed.acceptance_criteria == original.acceptance_criteria
    assert parsed.scope_out == original.scope_out
    assert parsed.background == original.background


def test_criteria_without_ids_are_numbered_and_the_reviewer_is_told(cfg):
    parsed = parse_brd_markdown(
        "## A title\n\n### Acceptance Criteria\n- the thing works\n- the other thing works\n"
    )
    assert [c.id for c in parsed.brd.acceptance_criteria] == ["AC-1", "AC-2"]
    assert any("numbered" in w for w in parsed.warnings)


@pytest.mark.parametrize(
    "bullet",
    ["- **AC-7** text here", "- AC-7: text here", "- [AC-7] text here", "- AC 7 — text here"],
)
def test_criterion_ids_survive_however_the_author_wrote_them(bullet):
    parsed = parse_brd_markdown(f"## A title\n\n### Acceptance Criteria\n{bullet}\n")
    assert parsed.brd.acceptance_criteria[0].id == "AC-7"
    assert parsed.brd.acceptance_criteria[0].text == "text here"


def test_a_config_cannot_declare_both_an_edge_and_a_replacement(raw_config, tmp_path, monkeypatch):
    """Two contradictory answers to one rejection is a configuration error."""
    from codegen_core.core.config import ConfigLoader
    from codegen_core.core.errors import ConfigError

    raw_config["pipeline"]["remediation_edges"].append(
        {"from": 6, "on": "REJECTED", "to": 5, "max_loops": 3}
    )
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw_config))
    monkeypatch.setenv("CODEGEN_PROFILE", "local")

    with pytest.raises(ConfigError, match="send the run backwards"):
        ConfigLoader.load(path)


def test_halting_is_still_what_happens_where_no_edge_and_no_revision_exist(cfg, ctx):
    """The generic path is unchanged: an undeclared failure status stops the run."""
    from codegen_core.orchestrator.remediation import Remediation

    with pytest.raises(PipelineHalted, match="no remediation edge"):
        Remediation(cfg, ctx.journal).next_step(9, "WEIRD_STATUS", ctx)
