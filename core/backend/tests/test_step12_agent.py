"""Unit tests for step-12 agent prompt injection."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from codegen_core.core.envelope import FailurePayload
from codegen_core.steps.step12.agent import run_agent_fix
from codegen_core.steps.step12.failures import extend_prompt_with_failures
from codegen_core.tools.file_write_guard import GuardedFS


class _Policy:
    def check_path(self, path, allowed):
        return None

    def check_changeset(self, files, loc):
        return None


def test_extend_prompt_includes_prior_failure_summaries():
    prior = [
        FailurePayload(
            step_id="14",
            failure_class="LINT",
            summary="step 14 FAILED [LINT]: ruff found 2 issues",
            findings=["E501 line too long", "F401 unused import"],
        )
    ]
    out = extend_prompt_with_failures("implement the feature", prior)
    assert "Prior failures:" in out
    assert "step 14 FAILED [LINT]" in out
    assert "E501 line too long" in out
    assert "Detailed findings:" in out


def test_run_agent_fix_injects_prior_failures_into_prompt(tmp_path):
    guard = GuardedFS(tmp_path, ["**/*"], _Policy(), loc_budget=100, step=12, author="test")
    prior = [
        FailurePayload(
            step_id="16",
            failure_class="TEST",
            summary="step 16 FAILED [TEST]: assertion error",
            findings=["test_login failed: expected 200"],
        )
    ]

    captured: dict = {}

    class _Completion:
        text = '{"files": []}'
        usage = {"tokens_in": 1, "tokens_out": 1}

        def as_json(self):
            return {"files": [{"path": "app/x.py", "content": "x = 1\n"}]}

    router = MagicMock()
    router.complete.side_effect = lambda step, system, user: (
        captured.update({"user": user}) or (_Completion(), None)
    )

    ctx = SimpleNamespace(
        router=router,
        journal=SimpleNamespace(append_event=lambda *a, **k: None),
        job_id="JOB-1",
    )
    backend = SimpleNamespace(model_id="mock", id="mock")

    result = run_agent_fix(
        ctx,
        backend=backend,
        system="sys",
        user="base instruction",
        guard=guard,
        prior_failures=prior,
    )
    assert "Prior failures:" in result.prompt
    assert "test_login failed" in result.prompt
    assert "assertion error" in captured["user"]
    assert (tmp_path / "app" / "x.py").exists()
