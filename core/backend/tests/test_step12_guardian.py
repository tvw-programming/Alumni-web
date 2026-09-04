"""GuardedFS audit trail + step-12 loop-budget enforcement + gateway isolation."""

from __future__ import annotations

import copy
import json
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from codegen_core.core.component import Tool
from codegen_core.core.config import ConfigLoader
from codegen_core.core.context import JobContext
from codegen_core.core.envelope import ComponentRef, Envelope, Intent, RemediationSource
from codegen_core.steps.step12.gateway import run_gateway_patch
from codegen_core.steps.step12.router import dispatch_code_update
from codegen_core.tools.file_write_guard import GuardedFS


class _Policy:
    def check_path(self, path, allowed):
        return None

    def check_changeset(self, files, loc):
        return None


def test_guardedfs_write_records_audit_fields(tmp_path):
    events: list[dict] = []

    class _J:
        def append_event(self, kind, **fields):
            events.append({"event": kind, **fields})

    guard = GuardedFS(
        tmp_path,
        ["**/*"],
        _Policy(),
        loc_budget=100,
        author="code_update",
        step=12,
        trace_id="trace_abc",
        journal=_J(),
    )
    guard.write_file("app/a.py", "print(1)\n")
    assert events[0]["event"] == "guardedfs_write"
    assert events[0]["author"] == "code_update"
    assert events[0]["step"] == 12
    assert events[0]["path"] == "app/a.py"
    assert len(events[0]["sha256"]) == 64
    assert events[0]["trace_id"] == "trace_abc"
    assert (tmp_path / "app" / "a.py").read_text() == "print(1)\n"


def test_gateway_patch_is_isolated_noop_without_writes(tmp_path):
    ctx = SimpleNamespace(
        cfg=SimpleNamespace(gateway=SimpleNamespace(mode="direct")),
        job_id="GW-ISO",
        workspace=tmp_path,
    )
    result = run_gateway_patch(ctx, writes=[], findings=["lint: unused"])
    assert result.ok
    assert result.status == "noop"
    assert result.findings == ["lint: unused"]


def test_loop_budget_exhaustion_routes_before_agent(tmp_path, raw_config, monkeypatch):
    raw = copy.deepcopy(raw_config)
    raw["pipeline"]["loop_budget"] = 2
    raw["app"]["paths"] = {
        "artifacts": str(tmp_path / "artifacts" / "{job_id}"),
        "runs": str(tmp_path / "runs" / "{job_id}"),
        "workspace": str(tmp_path / "workspace" / "{job_id}"),
        "prompts": raw_config["app"]["paths"]["prompts"],
        "schema_registry": str(tmp_path / "schemas"),
    }
    cfg_path = tmp_path / "config.json"
    cfg_path.write_text(json.dumps(raw))
    monkeypatch.setenv("CODEGEN_PROFILE", "local")
    cfg = ConfigLoader.load(cfg_path)

    ctx = JobContext.create(cfg, "DEEP-LOOP")
    ctx.journal.append_event("code_fix_loop", step=12, loop_count=1)
    ctx.journal.append_event("code_fix_loop", step=12, loop_count=2)
    assert ctx.journal.code_fix_loop_count() == 2

    ctx.remember(
        "ImpactManifestV1",
        {
            "allowed_paths": ["**/*"],
            "loc_budget": 50,
            "files_to_modify": ["app/x.py"],
            "files_to_create": [],
        },
    )
    ctx.remember(
        "FeatureSpecV1",
        {
            "summary": "add endpoint",
            "acceptance_criteria": ["returns 200"],
            "api_contracts": [],
        },
    )

    class Fake12(Tool):
        step = 12
        name = "code_update"
        consumes = []
        produces = []
        accepts = ["*/*"]

        def handle(self, env, ctx):
            return dispatch_code_update(self, env, ctx)

    env = Envelope(
        correlation_id="c",
        sender=ComponentRef(name="runner", kind="orchestrator"),
        recipient=ComponentRef(step=12, name="code_update", kind="agent"),
        intent=Intent.REQUEST,
    )
    # If budget check fails, LLM must never be called.
    ctx.router = SimpleNamespace(
        backend_for=lambda s: (_ for _ in ()).throw(AssertionError("backend should not run")),
        complete=lambda *a, **k: (_ for _ in ()).throw(AssertionError("complete should not run")),
    )

    out = Fake12().handle(env, ctx)
    assert out.status == "LOOP_BUDGET_EXHAUSTED"
    assert out.remediation_source == RemediationSource.LOOP_BUDGET_EXHAUSTED
    assert out.loop_budget == 2
    assert out.loop_count == 2
