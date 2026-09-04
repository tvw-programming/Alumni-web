"""Parallel group scheduling: overlap, concurrency cap, sequential default, DAG barrier."""

from __future__ import annotations

import json
import threading
import time
from pathlib import Path

import pytest

from codegen_core.core.component import Tool
from codegen_core.core.config import ConfigLoader
from codegen_core.core.context import JobContext
from codegen_core.core.errors import ConfigError
from codegen_core.orchestrator.runner import PipelineRunner

ROOT = Path(__file__).resolve().parents[1]


def _load(tmp_path, raw, profile="local"):
    path = tmp_path / "config.json"
    path.write_text(json.dumps(raw))
    return ConfigLoader.load(path, profile=profile)


def _cfg(tmp_path, raw_config, groups, max_parallel_steps=3):
    raw_config["pipeline"]["parallel_groups"] = groups
    raw_config["pipeline"]["max_parallel_steps"] = max_parallel_steps
    raw_config["app"]["concurrency"]["max_parallel_steps"] = max_parallel_steps
    raw_config["app"]["paths"] = {
        "artifacts": str(tmp_path / "artifacts" / "{job_id}"),
        "runs": str(tmp_path / "runs" / "{job_id}"),
        "workspace": str(tmp_path / "workspace" / "{job_id}"),
        "prompts": str(ROOT / "config" / "prompts"),
        "schema_registry": str(tmp_path / "schemas"),
    }
    return _load(tmp_path, raw_config)


class _TimedTool(Tool):
    def __init__(self, step, delay, timeline, active=None, emits="", consumes=None):
        self.step = step
        self.name = f"timed_{step}"
        self.delay = delay
        self.timeline = timeline
        self.active = active
        self.emits = emits
        self.consumes = list(consumes or [])
        self.produces = []
        self.accepts = ["*/*"]

    def handle(self, env, ctx):
        if self.active is not None:
            with self.active["lock"]:
                self.active["current"] += 1
                self.active["peak"] = max(self.active["peak"], self.active["current"])
        start = time.monotonic()
        self.timeline.append({"step": self.step, "phase": "start", "t": start})
        time.sleep(self.delay)
        if self.emits:
            ctx.remember(self.emits, {"from_step": self.step})
        end = time.monotonic()
        self.timeline.append({"step": self.step, "phase": "end", "t": end})
        if self.active is not None:
            with self.active["lock"]:
                self.active["current"] -= 1
        return env.reply(self.ref(), [], status="OK")


def _intervals(timeline, step):
    start = next(e["t"] for e in timeline if e["step"] == step and e["phase"] == "start")
    end = next(e["t"] for e in timeline if e["step"] == step and e["phase"] == "end")
    return start, end


def _overlaps(a, b):
    return a[0] < b[1] and b[0] < a[1]


def test_parallel_groups_eighteen_nineteen_overlap(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config, [[18, 19]], max_parallel_steps=3)
    timeline = []
    ctx = JobContext.create(cfg, "DEEP-1042")
    ctx.journal.append_approval(6, {"status": "APPROVED", "approver_id": "test"})
    ctx.impact_manifest = {"allowed_paths": ["**/*"], "loc_budget": 300}
    registry = {
        18: _TimedTool(18, 0.20, timeline),
        19: _TimedTool(19, 0.20, timeline),
    }
    result = PipelineRunner(cfg, registry).run(ctx, start=18, stop=19)
    assert result.ok
    assert _overlaps(_intervals(timeline, 18), _intervals(timeline, 19))


def test_max_parallel_steps_caps_wave(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config, [[2, 3, 4]], max_parallel_steps=2)
    timeline = []
    active = {"current": 0, "peak": 0, "lock": threading.Lock()}
    registry = {
        1: _TimedTool(1, 0.01, timeline, active),
        2: _TimedTool(2, 0.15, timeline, active),
        3: _TimedTool(3, 0.15, timeline, active),
        4: _TimedTool(4, 0.15, timeline, active),
    }
    ctx = JobContext.create(cfg, "DEEP-1042")
    result = PipelineRunner(cfg, registry).run(ctx, start=1, stop=4)
    assert result.ok
    assert active["peak"] == 2


def test_empty_parallel_groups_remains_sequential(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config, [], max_parallel_steps=3)
    timeline = []
    registry = {
        1: _TimedTool(1, 0.08, timeline),
        2: _TimedTool(2, 0.08, timeline),
        3: _TimedTool(3, 0.08, timeline),
    }
    ctx = JobContext.create(cfg, "DEEP-1042")
    result = PipelineRunner(cfg, registry).run(ctx, start=1, stop=3)
    assert result.ok
    assert not _overlaps(_intervals(timeline, 1), _intervals(timeline, 2))
    assert not _overlaps(_intervals(timeline, 2), _intervals(timeline, 3))


def test_dag_barrier_runs_producer_before_consumer_sibling(tmp_path, raw_config):
    """Within a group, a step that consumes a sibling emit waits for that sibling."""
    cfg = _cfg(tmp_path, raw_config, [[2, 3]], max_parallel_steps=3)
    timeline = []
    registry = {
        1: _TimedTool(1, 0.01, timeline),
        2: _TimedTool(2, 0.12, timeline, emits="SiblingOutV1"),
        3: _TimedTool(3, 0.05, timeline, consumes=["SiblingOutV1"]),
    }
    ctx = JobContext.create(cfg, "DEEP-1042")
    result = PipelineRunner(cfg, registry).run(ctx, start=1, stop=3)
    assert result.ok
    # 3 must start at/after 2 ends — no overlap when hard sibling dep.
    assert _intervals(timeline, 3)[0] >= _intervals(timeline, 2)[1] - 0.01


def test_step_seven_can_parallel_with_eight(tmp_path, raw_config):
    cfg = _cfg(tmp_path, raw_config, [[7, 8]], max_parallel_steps=3)
    timeline = []
    ctx = JobContext.create(cfg, "DEEP-1042")
    ctx.journal.append_approval(6, {"status": "APPROVED", "approver_id": "test"})
    registry = {
        7: _TimedTool(7, 0.18, timeline),
        8: _TimedTool(8, 0.18, timeline),
    }
    result = PipelineRunner(cfg, registry).run(ctx, start=7, stop=8)
    assert result.ok
    assert _overlaps(_intervals(timeline, 7), _intervals(timeline, 8))


def test_gate_cannot_join_parallel_group(tmp_path, raw_config):
    with pytest.raises(ConfigError, match="cannot include gate"):
        _cfg(tmp_path, raw_config, [[18, 24]])
