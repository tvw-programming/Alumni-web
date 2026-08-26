"""Carry out the work a human asked for in the dashboard.

The API is deliberately read-mostly: it records intent — a gate decision, a
retry, a run to start — and never executes a pipeline itself. Keeping model
calls, repository writes and multi-minute steps out of the request path is what
lets the dashboard stay responsive and an API restart stay harmless.

Something has to close that loop, and this is it. Three kinds of intent are
picked up, each in a subprocess:

    gate decision the journal has not absorbed  ->  codegen-core resume <job>
    retry_requested for a failed step           ->  codegen-core retry  <job> <step>
    run_requested on a fresh job                ->  codegen-core resume <job>

It is deliberately dumb — one job at a time, no queue, no retries beyond the
next tick — because the failure mode of a clever supervisor is a run that
advances when nobody asked it to.
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path

POLL_SECONDS = float(os.getenv("CODEGEN_WATCH_INTERVAL", "3"))
RUNS_ROOT = Path(os.getenv("CODEGEN_RUNS_ROOT", "/data/runs"))
GATES = ("06", "24")


def log(message: str) -> None:
    print(f"\033[38;5;179m[watcher]\033[0m {message}", flush=True)


def journal_entries(job: Path) -> list[dict]:
    path = job / "journal.ndjson"
    if not path.exists():
        return []
    out = []
    for line in path.read_text().splitlines():
        if line.strip():
            try:
                out.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return out


def decided_at(record: dict) -> str:
    return str(record.get("decided_at") or record.get("at") or "")


def last_recorded_decision(entries: list[dict], step: int) -> str:
    """When the journal last absorbed a decision at this gate."""
    stamps = [decided_at(e) for e in entries if e.get("type") == "approval" and e.get("step") == step]
    return max(stamps, default="")


def pending_decision(job: Path) -> tuple[int, dict] | None:
    """A decision on disk that the journal has not recorded yet.

    Compared by time rather than presence: a gate can be decided more than once
    — rejected, answered with a replacement document, then decided again — and
    "this gate has an approval somewhere in the record" would leave the second
    decision sitting on disk with nothing to act on it.
    """
    entries = journal_entries(job)
    for gate in GATES:
        decision_file = job / "gates" / f"{gate}_decision.json"
        if not decision_file.exists():
            continue
        step = int(gate)
        try:
            decision = json.loads(decision_file.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        if decided_at(decision) <= last_recorded_decision(entries, step):
            continue
        return step, decision
    return None


def pending_request(job: Path) -> tuple[str, dict] | None:
    """An intent the API recorded that the orchestrator has not acted on yet.

    Both kinds are journal events, so they are ordered against the step records
    around them and the "has it been acted on" test is the same in each case:
    did anything happen at that step *after* the request was written.
    """
    entries = journal_entries(job)
    for event in reversed(entries):
        if event.get("type") != "event":
            continue
        kind = event.get("event")
        if kind not in ("retry_requested", "run_requested"):
            continue
        stamp = str(event.get("at") or "")
        step = event.get("step")
        acted = any(
            str(e.get("at") or "") > stamp
            and (
                # The retry ran, or the run started, after the ask.
                (e.get("type") == "step" and (step is None or e.get("step") == step))
                or (e.get("type") == "event" and e.get("event") in ("retry_started", "run_started"))
            )
            for e in entries
        )
        if not acted:
            return kind, event
        # Only the newest request of each kind matters; an older one that was
        # acted on means everything before it was too.
        return None
    return None


def execute(job_id: str, argv: list[str], what: str) -> None:
    """Run one orchestrator command for a job, and say what came of it."""
    log(f"{job_id}: {what}")
    result = subprocess.run(
        [sys.executable, "-m", "codegen_core.cli", *argv],
        capture_output=True,
        text=True,
        timeout=int(os.getenv("CODEGEN_RESUME_TIMEOUT", "900")),
    )
    if result.returncode == 0:
        log(f"{job_id}: finished cleanly")
    else:
        # A non-zero exit is usually the run stopping at the next gate or at a
        # blocked step, which is normal. Surface the tail rather than retrying.
        tail = (result.stderr or result.stdout).strip().splitlines()[-3:]
        log(f"{job_id}: stopped (exit {result.returncode}) — " + " / ".join(tail))


def poll(job: Path, seen: set[tuple[str, str, str]]) -> None:
    """Act on at most one thing per job per tick, decisions first.

    A gate decision outranks a retry: if both are outstanding, the human at the
    gate is the one holding the run up. `seen` is keyed by timestamp because
    every intent can legitimately happen twice — a gate decided again after a
    replacement document, a step retried after failing twice.
    """
    decision = pending_decision(job)
    if decision is not None:
        step, body = decision
        key = (job.name, f"gate{step}", decided_at(body))
        if key not in seen:
            seen.add(key)
            status = body.get("status", "?")
            who = body.get("approver_id", "someone")
            log(f"{job.name}: gate {step:02d} {status.lower()} by {who}")
            execute(job.name, ["resume", job.name], f"resuming after the gate {step:02d} decision")
        return

    request = pending_request(job)
    if request is None:
        return
    kind, event = request
    key = (job.name, kind, str(event.get("at") or ""))
    if key in seen:
        return
    seen.add(key)

    if kind == "retry_requested":
        step = int(event.get("step", 0))
        who = event.get("requested_by", "someone")
        execute(job.name, ["retry", job.name, str(step)], f"retrying step {step:02d} for {who}")
    else:
        execute(job.name, ["resume", job.name], "starting the run")


def main() -> None:
    log(f"polling {RUNS_ROOT} every {POLL_SECONDS:g}s")
    #: (job, what, when) — the timestamp is part of the key because the same
    #: intent can be raised more than once and each raising deserves its own run.
    seen: set[tuple[str, str, str]] = set()

    while True:
        try:
            if RUNS_ROOT.exists():
                for job in sorted(RUNS_ROOT.iterdir()):
                    if job.is_dir():
                        poll(job, seen)
        except Exception as exc:  # noqa: BLE001 - a watcher must not die
            log(f"error: {exc}")
        time.sleep(POLL_SECONDS)


if __name__ == "__main__":
    main()
