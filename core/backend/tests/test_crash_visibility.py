"""A crashed run must look crashed.

All three behaviours here have the same failure signature and the same cause: a
step that produced no journal record. The runner wrote the record only after
`handle` returned, the retry policy re-raised anything that was not a transport
error, and the presenter read "no record, predecessors finished" as RUNNING. A
run killed mid-step therefore showed its next step as running indefinitely, with
no failure for anyone to retry.
"""

from __future__ import annotations

import json

import pytest
from pydantic import BaseModel, ValidationError

from codegen_core.core.errors import BackendError, StepError
from codegen_core.dashboard.presenter import RunPresenter
from codegen_core.orchestrator.retry import RetryPolicy
from codegen_core.orchestrator.runner import PipelineRunner


class _Model(BaseModel):
    covers: list[str]


def _validation_error() -> ValidationError:
    """The real thing, not a stand-in: this is the shape a step actually raises."""
    with pytest.raises(ValidationError) as caught:
        _Model(covers="U-6")
    return caught.value


# --------------------------------------------------------------------------- #
# 1. The runner records what killed the step.
# --------------------------------------------------------------------------- #
def test_a_step_raising_a_non_codegen_error_is_journalled_and_halts(cfg, ctx):
    """A ValidationError is a ValueError, so the old `except CodeGenCoreError`
    let it escape the loop and kill the process with the journal still silent."""
    runner = PipelineRunner(cfg)

    def explode(_env, _ctx):
        raise _validation_error()

    runner.prepare(ctx)
    runner.registry[3].handle = explode

    result = runner.run(ctx, start=1, stop=5)

    assert result.ok is False, "the run must stop rather than continue past a crash"
    errors = [e for e in ctx.journal.entries() if e.get("event") == "step_error"]
    assert [e["step"] for e in errors] == [3]
    # The type is in front because a bare ValidationError's message never names
    # it, and an IndexError's message is empty.
    assert errors[0]["error"].startswith("ValidationError:")
    assert "covers" in errors[0]["error"]


def test_an_exception_with_no_message_still_names_itself(cfg, ctx):
    runner = PipelineRunner(cfg)

    def explode(_env, _ctx):
        raise IndexError()

    runner.prepare(ctx)
    runner.registry[3].handle = explode
    runner.run(ctx, start=1, stop=5)

    errors = [e for e in ctx.journal.entries() if e.get("event") == "step_error"]
    assert errors[0]["error"] == "IndexError"


def test_a_domain_error_keeps_the_message_it_was_written_with(cfg, ctx):
    """Widening the clause must not start decorating the errors that were
    already readable — those are sentences, and a class name in front of one
    only adds noise."""
    runner = PipelineRunner(cfg)

    def explode(_env, _ctx):
        raise StepError(3, "no story to work from")

    runner.prepare(ctx)
    runner.registry[3].handle = explode
    runner.run(ctx, start=1, stop=5)

    errors = [e for e in ctx.journal.entries() if e.get("event") == "step_error"]
    assert errors[0]["error"] == "step 03: no story to work from"


# --------------------------------------------------------------------------- #
# 2. A malformed field is resampled before it is fatal.
# --------------------------------------------------------------------------- #
#: Step 02 is one of the three the config gives more than one attempt (01, 02,
#: 12). Retrying is per-step policy, so this has to be asked of a step that has
#: attempts to spend.
RETRIED_STEP = 2


def test_validation_error_is_retried_then_succeeds(cfg):
    """A small local model typing a field wrong is a resampling problem."""
    assert cfg.step_cfg(RETRIED_STEP).retry.max_attempts > 1
    attempts = []

    def flaky():
        attempts.append(1)
        if len(attempts) == 1:
            raise _validation_error()
        return "second time lucky"

    assert RetryPolicy(cfg).call(flaky, RETRIED_STEP) == "second time lucky"
    assert len(attempts) == 2


def test_validation_error_is_re_raised_once_the_attempts_are_spent(cfg):
    """Retried is not the same as ignored — the last one still propagates, and
    the runner turns it into a recorded failure."""
    attempts = []

    def always_bad():
        attempts.append(1)
        raise _validation_error()

    with pytest.raises(ValidationError):
        RetryPolicy(cfg).call(always_bad, RETRIED_STEP)
    assert len(attempts) == cfg.step_cfg(RETRIED_STEP).retry.max_attempts

    # Same policy, same step: the transport errors it always retried still are.
    def transport():
        raise BackendError("connection reset")

    with pytest.raises(BackendError):
        RetryPolicy(cfg).call(transport, RETRIED_STEP)


# --------------------------------------------------------------------------- #
# 3. The presenter tells "next in line" from "under way".
# --------------------------------------------------------------------------- #
def _status_of(cfg, ctx, registry, step: int) -> str:
    return RunPresenter(cfg, ctx, registry).step_payload(step, registry[step])["status"]


@pytest.fixture
def two_steps_in(cfg, ctx):
    """Steps 01 and 02 finished, and the run never said it had stopped.

    `stop=2` on its own would append run_completed, which is a run ending on
    purpose rather than the killed one this file is about. Dropping that entry
    leaves the journal in the shape a killed process leaves it: the last thing
    written is step 02's record, and nothing follows.
    """
    runner = PipelineRunner(cfg)
    runner.run(ctx, start=1, stop=2)

    journal = ctx.journal.path if hasattr(ctx.journal, "path") else None
    kept = [e for e in ctx.journal.entries() if e.get("event") != "run_completed"]
    assert journal is not None and len(kept) < len(ctx.journal.entries())
    journal.write_text("".join(json.dumps(e) + "\n" for e in kept))
    return runner.registry


def test_the_next_step_is_running_while_the_run_is_recent(cfg, ctx, two_steps_in):
    assert _status_of(cfg, ctx, two_steps_in, 3) == "RUNNING"


def test_a_run_that_ended_on_purpose_leaves_the_next_step_pending(cfg, ctx):
    """`--stop 2` finishes cleanly. Step 03 was never asked for, so it is
    pending — silence after a deliberate ending is not a stall."""
    runner = PipelineRunner(cfg)
    runner.run(ctx, start=1, stop=2)

    assert _status_of(cfg, ctx, runner.registry, 3) == "PENDING"


def test_the_next_step_is_stalled_once_the_run_has_gone_quiet(
    cfg, ctx, two_steps_in, monkeypatch
):
    """The journal is minutes old and no process is left to add to it."""
    monkeypatch.setattr("codegen_core.dashboard.presenter.STALL_AFTER_S", 0)

    assert _status_of(cfg, ctx, two_steps_in, 3) == "STALLED"
    # Silence says nothing about steps that never came up for execution.
    assert _status_of(cfg, ctx, two_steps_in, 5) == "PENDING"

    run = RunPresenter(cfg, ctx, two_steps_in).run_payload()
    assert run["status"] == "STALLED"
    # Named as the obstruction, which is what puts it behind the Retry button.
    assert run["blockedAt"] == 3


def test_a_deliberate_halt_is_not_reported_as_a_stall(cfg, ctx, two_steps_in, monkeypatch):
    """A halt was recorded on purpose and says why; a stall is the absence of
    any such record. Age must not turn one into the other."""
    monkeypatch.setattr("codegen_core.dashboard.presenter.STALL_AFTER_S", 0)
    ctx.journal.append_event("run_halted", step=3, reason="budget exceeded")

    assert _status_of(cfg, ctx, two_steps_in, 3) == "PENDING"
    # The run carries the explanation; the step is simply one that never ran.
    assert RunPresenter(cfg, ctx, two_steps_in).run_payload()["status"] == "HALTED"


# --------------------------------------------------------------------------- #
# 4. A halted step says what actually became of it.
# --------------------------------------------------------------------------- #
def test_the_detail_names_the_halt_rather_than_asserting_a_route(cfg, ctx, two_steps_in):
    """It used to claim, of every non-OK status, that the orchestrator had
    "routed it through the remediation edge declared for this status". Edges
    exist for eight (step, status) pairs; step 03 is not one of them, so the
    sentence described a route that does not exist — most confidently exactly
    where a reader was most stuck."""
    ctx.journal._append(
        {"type": "step", "step": 3, "component": "gap_ambiguity_detection", "status": "FAILED"}
    )
    ctx.journal.append_event("run_halted", step=3, reason="no remediation edge for status 'FAILED'")

    error = RunPresenter(cfg, ctx, two_steps_in).step_payload(3, two_steps_in[3])["error"]

    assert "The run halted here" in error["detail"]
    assert "no remediation edge for status 'FAILED'" in error["detail"]
    assert "routed it through" not in error["detail"]


def test_a_step_with_a_real_edge_says_where_it_was_routed(cfg, ctx):
    """Step 13 on FAILED does have an edge, and the sentence is true there."""
    runner = PipelineRunner(cfg)
    runner.prepare(ctx)
    ctx.journal._append(
        {"type": "step", "step": 13, "component": "code_requirement_verification", "status": "FAILED"}
    )
    edge = next(
        e for e in cfg.pipeline.remediation_edges if e.from_step == 13 and e.on == "FAILED"
    )
    ctx.journal.record_loop(edge)

    detail = RunPresenter(cfg, ctx, runner.registry).step_payload(13, runner.registry[13])["error"]["detail"]

    assert "routed this back to step 12" in detail
    assert f"loop 1 of {edge.max_loops}" in detail


# --------------------------------------------------------------------------- #
# 5. Asking a question is not failing.
# --------------------------------------------------------------------------- #
def test_ambiguous_is_its_own_status_and_carries_its_questions(cfg, ctx, monkeypatch):
    """Step 03 halting on an underspecified ticket is the one job it has. It
    used to render as a red FAILED, with the five questions readable only inside
    the artifact."""
    monkeypatch.setenv("CODEGEN_AUTO_APPROVE", "1")
    runner = PipelineRunner(cfg)
    runner.prepare(ctx)
    runner.run(ctx, start=1, stop=2)

    report = {
        "gaps": ["no export format named"],
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

    presenter = RunPresenter(cfg, ctx, runner.registry)
    payload = presenter.step_payload(3, runner.registry[3])

    assert payload["status"] == "NEEDS_INPUT"
    assert [q["id"] for q in payload["blockingQuestions"]] == ["Q1", "Q2"]
    assert payload["blockingQuestions"][0]["blocksStep"] == 12
    assert payload["blockingQuestions"][1]["blocksStep"] is None

    run = presenter.run_payload()
    # It holds the run up like any other obstruction, and it wants a person.
    assert run["blockedAt"] == 3
    assert run["status"] == "AWAITING_APPROVAL"


def test_questions_are_dropped_once_the_step_is_no_longer_holding_the_run(cfg, ctx):
    """The artifact stays on disk after the questions are answered. Showing them
    then would read as an outstanding demand."""
    runner = PipelineRunner(cfg)
    runner.prepare(ctx)
    runner.run(ctx, start=1, stop=3)

    payload = RunPresenter(cfg, ctx, runner.registry).step_payload(3, runner.registry[3])

    assert payload["status"] == "SUCCESS"
    assert "blockingQuestions" not in payload
