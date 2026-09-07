"""The dashboard contract.

The run monitor reconstructs everything from the journal and the artifact
index. These tests pin the wire format, because a UI in another repository
depends on it, and they pin the property that matters most: a decision taken
in the dashboard reaches the orchestrator's audit trail intact.
"""

import json

import pytest

fastapi = pytest.importorskip("fastapi", reason="dashboard extra not installed")
from fastapi.testclient import TestClient  # noqa: E402

from codegen_core.dashboard.api import create_app  # noqa: E402
from codegen_core.dashboard.presenter import PHASE_BY_STEP, humanise  # noqa: E402
from codegen_core.orchestrator.runner import PipelineRunner  # noqa: E402


@pytest.fixture
def completed_job(cfg, ctx, monkeypatch, tmp_path):
    """A finished run on disk, plus a client pointed at the same config."""
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    PipelineRunner(cfg).run(ctx)

    config_path = tmp_path / "written-config.json"
    config_path.write_text(cfg.model_dump_json())
    return ctx


@pytest.fixture
def client(cfg, monkeypatch):
    monkeypatch.setattr("codegen_core.dashboard.api.ConfigLoader.load", lambda *a, **k: cfg)
    return TestClient(create_app())


# --------------------------------------------------------------------------- #
def test_health_reports_the_active_configuration(client, cfg):
    body = client.get("/api/health").json()
    assert body["ok"] is True
    assert body["steps"] == 24
    assert body["gates"] == ["06", "24"]
    assert body["profile"] == cfg.active_profile
    # Product UI link comes from app.project.ui_url (Alumni sample by default).
    assert body["projectUi"] is not None
    assert body["projectUi"]["url"].startswith("http")
    assert body["projectUi"]["label"]


def test_run_payload_has_every_field_the_ui_requires(client, completed_job, cfg):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()

    for key in (
        "jobId", "jiraId", "title", "profile", "status",
        "startedAt", "updatedAt", "costUsd", "budgetUsd", "steps", "edges",
    ):
        assert key in run, f"run payload is missing {key}"

    assert len(run["steps"]) == 24
    # Rejected BRD gate has no edge (answered with a replacement document).
    # Edge count tracks config.pipeline.remediation_edges.
    assert len(run["edges"]) == len(cfg.pipeline.remediation_edges)
    assert not any(e["from"] == 6 for e in run["edges"])


def test_every_step_carries_the_fields_the_ui_renders(client, completed_job):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    required = {
        "step", "name", "title", "category", "kind", "phase", "consumes", "produces",
        "rationale", "status", "startedAt", "durationMs", "attempt", "provenance",
        "artifacts", "input", "output", "tasks", "riskLevel", "allowedActions",
    }
    for step in run["steps"]:
        missing = required - set(step)
        assert not missing, f"step {step['step']} is missing {missing}"
        assert step["phase"] in set(PHASE_BY_STEP.values())
        assert step["kind"] in {"AGENT", "TOOL", "PLUGIN", "GATE"}
        assert set(step["provenance"]) >= {"backendId", "modelId", "tokensIn", "tokensOut", "costUsd"}


def test_a_later_step_result_hides_an_old_transport_error(cfg, ctx):
    """A model can fail transiently and then return a real FAILED verdict. The
    dashboard must describe that verdict, not the older transport failure."""
    from codegen_core.dashboard.presenter import RunPresenter
    from codegen_core.steps._loader import load_steps

    ctx.journal.append_event("step_error", step=13, error="backend terminated")
    ctx.journal._append(
        {
            "type": "step",
            "step": 13,
            "component": "code_requirement_verification",
            "kind": "AGENT",
            "status": "FAILED",
            "schemas": ["RequirementCoverageV1"],
            "provenance": {"model_id": "reviewer-4b"},
        }
    )

    registry = load_steps(cfg)
    payload = RunPresenter(cfg, ctx, registry).step_payload(13, registry[13])
    assert payload["status"] == "FAILED"
    assert payload["error"]["code"] == "FAILED"
    assert "terminated" not in payload["error"]["message"]


def test_agent_steps_report_the_tasks_they_ran(client, completed_job):
    """The per-step checklist the monitor draws under a running step.

    Pinned because it is rebuilt from journal entries rather than stored: the
    presenter reads the entries it cached at construction, and a refactor that
    reaches for a journal attribute instead breaks every run page at once.
    """
    run = client.get(f"/api/runs/{completed_job.job_id}").json()

    agent_steps = [s for s in run["steps"] if s["kind"] == "AGENT" and s["tasks"]]
    assert agent_steps, "no step reported any task"

    for step in agent_steps:
        for task in step["tasks"]:
            assert set(task) == {"id", "title", "status", "detail", "durationMs"}
            assert task["id"].startswith(f"{step['step']:02d}.")
            assert task["status"] in {"pending", "running", "done", "failed", "skipped"}
        # A finished run must not leave anything mid-flight: a task stuck at
        # "running" is indistinguishable in the UI from a slow one.
        assert not [t for t in step["tasks"] if t["status"] == "running"]


def test_rationale_explains_the_component_choice(client, completed_job):
    """Every step's docstring must survive into the UI, or the inspector is empty."""
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    for step in run["steps"]:
        assert len(step["rationale"]) > 40, f"step {step['step']} has no rationale"


def test_durations_are_derived_for_every_executed_step(client, completed_job):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    timed = [s for s in run["steps"] if s["durationMs"] is not None]
    assert len(timed) >= 23  # the very first record has nothing to measure against
    assert all(s["durationMs"] >= 0 for s in timed)


def test_input_is_reconstructed_from_producer_artifacts(client, completed_job):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    step9 = next(s for s in run["steps"] if s["step"] == 9)
    assert set(step9["input"]) == set(step9["consumes"])


def test_inputs_that_cannot_be_replayed_say_so(client, completed_job):
    """A consumed schema whose producer wrote a document is named, not dropped."""
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    step9 = next(s for s in run["steps"] if s["step"] == 9)
    repo = step9["input"]["RepoUnderstandingV1"]
    assert "_unavailable" in repo
    assert repo["_artifacts"]


def test_gates_expose_the_roles_that_may_decide(client, completed_job):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    gates = [s for s in run["steps"] if s["kind"] == "GATE"]
    assert [g["step"] for g in gates] == [6, 24]
    assert all(g["requiredRoles"] for g in gates)


def test_a_gate_exposes_the_document_it_gates(client, completed_job):
    """A gate writes only its decision, so the artifacts under review come from
    the gate request. Without them the dashboard asks for an approval of a
    document it never showed."""
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    gate = next(s for s in run["steps"] if s["step"] == 6)

    review = gate["reviewArtifacts"]
    assert review, "gate 06 must expose the BRD it was opened against"
    assert any(a["ext"] == "md" for a in review)
    assert all(
        set(a) == {"file", "ext", "outputClass", "bytes", "sha256", "superseded", "source"}
        for a in review
    )
    # Nothing under review has been replaced; a gate never opens against bytes
    # the run has already superseded.
    assert not any(a["superseded"] for a in review)

    # And each one is readable, or showing it in the dialog is a dead link.
    for artifact in review:
        r = client.get(f"/api/runs/{completed_job.job_id}/artifacts/{artifact['file']}")
        assert r.status_code == 200, artifact["file"]

    # It is the earlier step's output, not something the gate itself wrote.
    brd = next(s for s in run["steps"] if s["step"] == 5)
    assert {a["file"] for a in review} >= {a["file"] for a in brd["artifacts"] if a["ext"] == "md"}


def test_non_gate_steps_have_no_review_artifacts(client, completed_job):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    assert all("reviewArtifacts" not in s for s in run["steps"] if s["kind"] != "GATE")


def test_approval_is_bound_to_an_artifact_checksum(client, completed_job):
    run = client.get(f"/api/runs/{completed_job.job_id}").json()
    gate = next(s for s in run["steps"] if s["step"] == 6)
    assert gate["approval"]["status"] == "APPROVED"
    assert gate["approval"]["artifactSha256"]


# --------------------------------------------------------------------------- #
def test_the_role_the_payload_advertises_can_actually_decide(cfg, ctx, client, monkeypatch):
    """The dashboard offers the reviewer the roles from `requiredRoles`, so a
    decision taken as one of them must be accepted. A gate whose advertised role
    is refused leaves a reviewer with a 403 and no way forward."""
    monkeypatch.delenv("CODEGEN_AUTO_APPROVE", raising=False)
    PipelineRunner(cfg).run(ctx, stop=5)

    from codegen_core.plugins.factory import build_plugin

    build_plugin(cfg, "dashboard", ctx).open_gate(ctx, 6, ctx.artifacts.of_step(5), cfg.gates["06"])

    gate = next(s for s in client.get(f"/api/runs/{ctx.job_id}").json()["steps"] if s["step"] == 6)
    role = gate["requiredRoles"][0]

    r = client.post(
        f"/api/runs/{ctx.job_id}/steps/6/decision",
        json={"status": "APPROVED", "approverId": "priya.raman", "approverRole": role},
    )
    assert r.status_code == 200, r.json()
    decided = next(s for s in r.json()["run"]["steps"] if s["step"] == 6)
    assert decided["approval"]["approverRole"] == role


def test_a_wrong_role_cannot_decide_a_gate(client, completed_job):
    r = client.post(
        f"/api/runs/{completed_job.job_id}/steps/6/decision",
        json={"status": "APPROVED", "approverId": "sam", "approverRole": "intern"},
    )
    assert r.status_code == 403
    assert "intern" in r.json()["detail"]


def test_only_approve_or_reject_are_accepted(client, completed_job):
    r = client.post(
        f"/api/runs/{completed_job.job_id}/steps/6/decision",
        json={"status": "MAYBE", "approverId": "p", "approverRole": "product_owner"},
    )
    assert r.status_code == 400


def test_a_decision_reaches_the_journal_with_the_real_approver(cfg, ctx, client, monkeypatch):
    """The property the whole gate exists for: the dashboard cannot launder
    an approval into an anonymous one."""
    monkeypatch.delenv("CODEGEN_AUTO_APPROVE", raising=False)
    PipelineRunner(cfg).run(ctx, stop=5)

    from codegen_core.plugins.factory import build_plugin

    build_plugin(cfg, "dashboard", ctx).open_gate(ctx, 6, ctx.artifacts.of_step(5), cfg.gates["06"])

    r = client.post(
        f"/api/runs/{ctx.job_id}/steps/6/decision",
        json={
            "status": "APPROVED",
            "approverId": "priya.raman",
            "approverRole": "product_owner",
            "comment": "Scope-out list is right.",
        },
    )
    assert r.status_code == 200

    # Visible immediately, before the runner has consumed it.
    gate = next(s for s in r.json()["run"]["steps"] if s["step"] == 6)
    assert gate["status"] == "APPROVED"
    assert gate["approval"]["approverId"] == "priya.raman"
    assert gate["approval"]["awaitingExecution"] is True

    # And it survives into the append-only record when the runner resumes.
    PipelineRunner(cfg).run(ctx, start=6, stop=6)
    approvals = [e for e in ctx.journal.entries() if e.get("type") == "approval"]
    assert approvals[-1]["approver_id"] == "priya.raman"
    assert approvals[-1]["approver_role"] == "product_owner"


# --------------------------------------------------------------------------- #
# --------------------------------------------------------------------------- #
def test_clarify_writes_story_input_and_requests_resume(client, cfg, ctx, monkeypatch):
    """Answering Q&A on the Ambiguous dialog updates the story and resumes."""
    from codegen_core.core import story_input

    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(
        ctx,
        {
            "key": ctx.jira_id,
            "title": "Export profile data",
            "description": "Users can export their profile.",
            "acceptance_criteria": ["AC-1 export returns JSON"],
            "entered_by": "tester",
        },
    )
    runner = PipelineRunner(cfg)
    runner.prepare(ctx)
    runner.run(ctx, start=1, stop=2)

    report = {
        "gaps": ["format unspecified"],
        "questions_for_human": [
            {"id": "Q1", "text": "What file format?", "blocks_step": 12},
            {"id": "Q2", "text": "Which rows?", "blocks_step": None},
        ],
        "blocking": True,
    }
    ctx.artifacts.write(3, "ambiguity_report", report, ext="json")
    ctx.journal._append(
        {"type": "step", "step": 3, "component": "gap_ambiguity_detection", "status": "AMBIGUOUS"}
    )
    # Spend the ambiguity loop budget so a re-check without reset would halt.
    ctx.journal._append({"type": "loop", "from": 3, "to": 2, "on": "CLASS:AMBIGUITY"})
    ctx.journal._append({"type": "loop", "from": 3, "to": 2, "on": "CLASS:AMBIGUITY"})

    monkeypatch.setattr("codegen_core.dashboard.api.ConfigLoader.load", lambda *a, **k: cfg)
    local = TestClient(create_app())

    r = local.post(
        f"/api/runs/{ctx.job_id}/steps/3/clarify",
        json={
            "answeredBy": "tejas.waghulde",
            "answers": [
                {"id": "Q1", "answer": "JSON only"},
                {"id": "Q2", "answer": "The signed-in user's own row"},
            ],
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "Q1" in body["message"] and "Q2" in body["message"]

    typed = story_input.load(ctx)
    assert typed is not None
    assert "Clarifications from run monitor" in typed.description
    assert "JSON only" in typed.description
    assert typed.entered_by == "tejas.waghulde"

    events = [e for e in ctx.journal.entries() if e.get("type") == "event"]
    assert any(e.get("event") == "ambiguity_clarified" for e in events)
    assert any(e.get("event") == "clarification_requested" for e in events)
    assert any(e.get("event") == "steps_invalidated" for e in events)

    # Fresh remediation budget after clarification.
    assert ctx.journal.class_loop_count("AMBIGUITY") == 0

    # Incomplete answers are refused.
    bad = local.post(
        f"/api/runs/{ctx.job_id}/steps/3/clarify",
        json={"answeredBy": "x", "answers": [{"id": "Q1", "answer": "only one"}]},
    )
    # Step is no longer NEEDS_INPUT after invalidate... actually after clarify,
    # step 3 is still AMBIGUOUS in the journal until resume; status is still
    # NEEDS_INPUT. Missing answer should 409.
    assert bad.status_code == 409


def test_artifacts_cannot_be_read_outside_the_job_directory(client, completed_job):
    job = completed_job.job_id
    assert client.get(f"/api/runs/{job}/artifacts/../../../etc/passwd").status_code == 404
    assert client.get(f"/api/runs/{job}/artifacts/nope.json").status_code == 404

    real = next(e["file"] for e in completed_job.artifacts.index() if e["ext"] == "json")
    assert client.get(f"/api/runs/{job}/artifacts/{real}").status_code == 200


def test_unknown_job_is_a_404(client):
    assert client.get("/api/runs/NOPE-0000").status_code == 404


def test_journal_endpoint_returns_the_audit_record(client, completed_job):
    entries = client.get(f"/api/runs/{completed_job.job_id}/journal").json()
    assert any(e.get("type") == "step" for e in entries)
    assert any(e.get("type") == "approval" for e in entries)


def test_visual_variants_are_served_from_config(client, cfg):
    """The dashboard draws a run using variants defined in config.json, so a new
    domain metaphor stays a JSON block rather than a UI code change."""
    body = client.get("/api/visual/variants").json()

    assert body["default"] in body["variants"]
    logistics = body["variants"]["logistics"]
    assert logistics["id"] == "logistics"
    assert logistics["label"] == "Logistics"
    assert logistics["headline"] == "Every release arrives on time"

    # camelCase on the wire, because a TypeScript client consumes it directly.
    assert "routeLabel" in logistics
    assert set(logistics["palette"]) >= {"accent", "accentBright", "surfaceCompleted", "muted"}
    assert all(value.startswith("#") for key, value in logistics["palette"].items() if key != "pattern")

    # And it is the config talking, not a constant in the API module.
    assert logistics["label"] == cfg.visualization.variants["logistics"].label


# --------------------------------------------------------------------------- #
@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("jira_story_extraction", "Jira story extraction"),
        ("brd_generation", "BRD generation"),
        ("ai_pull_request_review", "AI pull request review"),
        ("dast_runtime_security", "DAST runtime security"),
    ],
)
def test_step_names_are_humanised_without_mangling_acronyms(raw, expected):
    assert humanise(raw) == expected
