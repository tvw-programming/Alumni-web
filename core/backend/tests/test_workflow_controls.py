"""Developer-driven control of a run: start it, unblock it, don't pay twice.

Four properties, one per requirement:

  * nothing starts on its own, and step 01 uses what the developer typed
  * a failed step stops the run until a human resolves it, and Retry re-runs
    strictly that step before the run carries on
  * a step already produced for this story from these inputs is not produced
    again — the saving requirement 5 is about
  * neither of the two gates is ever answered from that cache
"""

import json

import pytest

from codegen_core.core import story_input
from codegen_core.core.errors import StepError
from codegen_core.core.ledger import StoryLedger
from codegen_core.orchestrator.runner import PipelineRunner
from codegen_core.steps._loader import load_steps

STORY = {
    "key": "DEEP-1042",
    "title": "Let users export their own data",
    "description": "Account owners need a CSV of their own records.",
    "acceptance_criteria": [
        "AC-1 An owner can request an export of their own data",
        "AC-2 A request for another account is refused",
    ],
    "entered_by": "priya.raman",
}


@pytest.fixture
def client(cfg, monkeypatch):
    pytest.importorskip("fastapi", reason="dashboard extra not installed")
    from fastapi.testclient import TestClient

    from codegen_core.dashboard.api import create_app

    monkeypatch.setattr("codegen_core.dashboard.api.ConfigLoader.load", lambda *a, **k: cfg)
    return TestClient(create_app())


def registry_with_failure(cfg, step: int, times: int = 1):
    """A step registry whose step `step` raises the first `times` calls."""
    registry = load_steps(cfg)
    component = registry[step]
    original = component.handle
    calls = {"n": 0}

    def failing(env, ctx):
        calls["n"] += 1
        if calls["n"] <= times:
            raise StepError(step, "the scanner could not reach the registry")
        return original(env, ctx)

    component.handle = failing  # type: ignore[method-assign]
    return registry, calls, lambda: setattr(component, "handle", original)


# --------------------------------------------------------------------------- #
# 3 + 4 — manual initiation, and what step 01 is told
# --------------------------------------------------------------------------- #
def test_starting_a_run_records_what_the_developer_typed(client, cfg):
    response = client.post("/api/runs", json={
        "jiraId": "DEEP-1042",
        "title": STORY["title"],
        "description": STORY["description"],
        "acceptanceCriteria": STORY["acceptance_criteria"],
        "startedBy": "priya.raman",
    })
    assert response.status_code == 201, response.json()
    body = response.json()
    assert body["jobId"].startswith("DEEP-1042-")

    from codegen_core.core.context import JobContext

    ctx = JobContext.create(cfg, "DEEP-1042", job_id=body["jobId"])
    typed = story_input.load(ctx)
    assert typed is not None
    assert typed.title == STORY["title"]
    assert typed.acceptance_criteria == STORY["acceptance_criteria"]

    # Recorded as an ask, not executed inside the request.
    events = [e for e in ctx.journal.entries() if e.get("event") == "run_requested"]
    assert events and events[-1]["started_by"] == "priya.raman"
    assert not [e for e in ctx.journal.entries() if e.get("type") == "step"]


def test_a_story_without_acceptance_criteria_is_refused_at_the_start(client):
    response = client.post("/api/runs", json={
        "jiraId": "DEEP-1042", "title": "No criteria", "acceptanceCriteria": [],
    })
    assert response.status_code == 422
    assert "acceptance criterion" in response.json()["detail"]


def test_step_01_prefers_the_typed_story_over_the_tracker(cfg, ctx):
    story_input.save(ctx, STORY)
    PipelineRunner(cfg).run(ctx, stop=1)

    produced = ctx.recall("JiraStoryV1")
    assert produced["title"] == STORY["title"]
    assert produced["acceptance_criteria"] == STORY["acceptance_criteria"]
    assert produced["source_checksum"], "a hand-typed story is checksummed like any other"

    source = [e for e in ctx.journal.entries() if e.get("event") == "story_source"][-1]
    assert source["source"] == "manual"


def test_skipping_the_form_falls_back_to_the_configured_tracker(cfg, ctx):
    """No story_input.json: step 01 reads whatever config.json points at."""
    PipelineRunner(cfg).run(ctx, stop=1)

    source = [e for e in ctx.journal.entries() if e.get("event") == "story_source"][-1]
    assert source["source"] == "tracker"
    assert ctx.recall("JiraStoryV1")["key"]


# --------------------------------------------------------------------------- #
# 1 — a failure blocks the run, and Retry is what clears it
# --------------------------------------------------------------------------- #
def test_a_failed_step_blocks_the_run(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    registry, _, restore = registry_with_failure(cfg, 9, times=99)
    try:
        result = PipelineRunner(cfg, registry).run(ctx)
    finally:
        restore()

    assert result.ok is False
    assert result.halted_at == 9
    ran = {e["step"] for e in ctx.journal.entries() if e.get("type") == "step"}
    assert not ran & set(range(10, 25)), "nothing past a failed step may run"


def test_retry_reruns_only_that_step_and_then_continues(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    registry, calls, restore = registry_with_failure(cfg, 9, times=1)
    try:
        runner = PipelineRunner(cfg, registry)
        assert runner.run(ctx).ok is False

        before = [e["step"] for e in ctx.journal.entries() if e.get("type") == "step"]
        result = runner.retry(ctx, 9)
    finally:
        restore()

    assert result.ok, result.reason
    assert calls["n"] == 2, "the failed step ran again"

    after = [e["step"] for e in ctx.journal.entries() if e.get("type") == "step"]
    fresh = after[len(before):]
    # Strictly that step, then forward — never back over completed work.
    assert fresh[0] == 9
    assert fresh == sorted(fresh)
    assert ctx.journal.completed(24)


def test_the_api_refuses_to_retry_a_step_that_did_not_fail(client, cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    PipelineRunner(cfg).run(ctx, stop=2)

    response = client.post(f"/api/runs/{ctx.job_id}/steps/2/retry", json={})
    assert response.status_code == 409
    assert "not failed" in response.json()["detail"]


def test_retry_is_recorded_as_intent_rather_than_run_in_the_request(client, cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    registry, _, restore = registry_with_failure(cfg, 9, times=99)
    try:
        PipelineRunner(cfg, registry).run(ctx)
    finally:
        restore()

    run = client.get(f"/api/runs/{ctx.job_id}").json()
    assert run["blockedAt"] == 9, "the dashboard names the step holding the run up"

    response = client.post(f"/api/runs/{ctx.job_id}/steps/9/retry",
                           json={"requestedBy": "sam.lee"})
    assert response.status_code == 200
    asked = [e for e in ctx.journal.entries() if e.get("event") == "retry_requested"]
    assert asked and asked[-1]["requested_by"] == "sam.lee"


# --------------------------------------------------------------------------- #
# 5 — the story ledger
# --------------------------------------------------------------------------- #
def test_a_second_run_of_the_same_story_reuses_what_exists(cfg, ctx, monkeypatch):
    from codegen_core.core.context import JobContext

    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(ctx, STORY)
    first = PipelineRunner(cfg).run(ctx)
    assert first.ok
    spend = ctx.journal.total_cost_usd()

    # A different job, same story, same inputs.
    second = JobContext.create(cfg, "DEEP-1042")
    story_input.save(second, STORY)
    assert PipelineRunner(cfg).run(second).ok

    cached = {e["step"] for e in second.journal.entries() if e.get("event") == "step_cached"}
    assert cached, "the second run reused nothing"
    assert 2 in cached and 5 in cached, "the expensive agent steps are the point"
    assert second.journal.total_cost_usd() <= spend

    # The reused artifacts are readable in the new job, not references to the old.
    for entry in second.artifacts.index():
        if entry.get("source") == "cache":
            assert second.artifacts.local_path(entry["file"]).is_file()


def test_the_two_gates_are_never_answered_from_the_ledger(cfg, ctx, monkeypatch):
    from codegen_core.core.context import JobContext

    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(ctx, STORY)
    PipelineRunner(cfg).run(ctx)

    second = JobContext.create(cfg, "DEEP-1042")
    story_input.save(second, STORY)
    PipelineRunner(cfg).run(second)

    cached = {e["step"] for e in second.journal.entries() if e.get("event") == "step_cached"}
    assert not cached & {6, 24}, "a human must decide this run's gates, not last run's"
    approvals = [e for e in second.journal.entries() if e.get("type") == "approval"]
    assert {a["step"] for a in approvals} == {6, 24}


def test_step_01_always_runs_so_an_edited_ticket_is_never_hidden(cfg, ctx, monkeypatch):
    from codegen_core.core.context import JobContext

    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(ctx, STORY)
    PipelineRunner(cfg).run(ctx, stop=2)

    edited = {**STORY, "title": "Let users export their own data, as CSV or JSON"}
    second = JobContext.create(cfg, "DEEP-1042")
    story_input.save(second, edited)
    PipelineRunner(cfg).run(second, stop=2)

    cached = {e["step"] for e in second.journal.entries() if e.get("event") == "step_cached"}
    assert 1 not in cached, "step 01 is where a changed ticket enters the run"
    assert 2 not in cached, "a changed story must invalidate everything built on it"
    assert second.recall("JiraStoryV1")["title"] == edited["title"]


def test_replacing_the_brd_invalidates_the_steps_built_on_it(cfg, ctx, monkeypatch):
    """The collision requirement 2 and requirement 5 would otherwise have."""
    from codegen_core.core.ledger import input_fingerprint

    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(ctx, STORY)
    PipelineRunner(cfg).run(ctx)

    ledger = StoryLedger(cfg, "DEEP-1042")
    entry = ledger.lookup(7, json.loads(ledger.path.read_text())["7"]["input_sha"])
    assert entry is not None

    # Step 07 consumes the BRD; a different BRD is a different key.
    before = input_fingerprint(["BrdV1", "StoryAnalysisV1"], ctx.store)
    ctx.remember("BrdV1", {**ctx.recall("BrdV1"), "title": "A different BRD"})
    after = input_fingerprint(["BrdV1", "StoryAnalysisV1"], ctx.store)
    assert before != after
    assert ledger.lookup(7, after) is None, "a replaced BRD cannot serve cached tests"


def test_a_corrupt_ledger_costs_tokens_but_never_correctness(cfg, ctx, monkeypatch):
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(ctx, STORY)
    PipelineRunner(cfg).run(ctx, stop=5)

    StoryLedger(cfg, "DEEP-1042").path.write_text("{ not json")

    from codegen_core.core.context import JobContext

    second = JobContext.create(cfg, "DEEP-1042")
    story_input.save(second, STORY)
    assert PipelineRunner(cfg).run(second, stop=5).ok
    assert second.recall("BrdV1"), "the run regenerated rather than failing"


def test_a_retry_ignores_the_cache(cfg, ctx, monkeypatch):
    """A person pressing Retry is asking for work, not for a lookup."""
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    story_input.save(ctx, STORY)
    PipelineRunner(cfg).run(ctx, stop=4)

    from codegen_core.core.context import JobContext

    second = JobContext.create(cfg, "DEEP-1042")
    story_input.save(second, STORY)
    runner = PipelineRunner(cfg)
    runner.run(second, stop=4)
    assert any(e.get("event") == "step_cached" for e in second.journal.entries())

    runner.retry(second, 4, resume=False)
    fresh = [e for e in second.journal.entries() if e.get("type") == "step" and e["step"] == 4]
    assert len(fresh) >= 2
    assert [e for e in second.journal.entries() if e.get("event") == "retry_started"]


def test_manual_input_that_is_unreadable_is_not_silently_ignored(cfg, ctx):
    """Falling through to the tracker would run a story the developer never saw."""
    story_input.path_for(ctx).write_text("{ not json")
    result = PipelineRunner(cfg).run(ctx, stop=1)

    assert result.ok is False
    assert result.halted_at == 1
    errors = [e for e in ctx.journal.entries() if e.get("event") == "step_error"]
    assert errors and "unreadable" in errors[-1]["error"]
