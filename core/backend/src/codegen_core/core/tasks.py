"""Per-step tasks, journalled as they happen.

A step is the unit the pipeline resumes from; a task is the unit a person
watches. Between "step 12 running" and "step 12 finished" there is currently a
minute or more of nothing, and the run monitor has no way to say whether the
model is still thinking, whether validation failed, or whether it is writing
files.

Tasks are journalled rather than held in memory, for the same reason everything
else here is: a run resumes in a different process, and a progress model that
only exists in RAM shows a resumed run as having done nothing.

**They are derived, not invented.** The default set is what `JsonAgentStep`
actually does — gather inputs, call the model, validate the schema, persist the
artifact. A step with extra work adds to it (step 12 declares intent, runs
guardrails and writes files). Nothing here fabricates progress that is not real
work, because a progress bar that lies is worse than none.
"""

from __future__ import annotations

import time
from contextlib import contextmanager
from dataclasses import dataclass
from typing import Any, Iterator, Literal

TaskStatus = Literal["pending", "running", "done", "failed", "skipped"]

#: Journal event kind. One record per transition, so a reader can reconstruct
#: the sequence without the writer holding state.
EVENT = "task"


@dataclass
class Task:
    id: str
    step: int
    title: str
    status: TaskStatus = "pending"
    detail: str | None = None
    duration_ms: int | None = None


class TaskTracker:
    """Creates and records the tasks of one step.

    Constructed per step by the runner, so ids are unique within a step without
    a global counter, and so a failed step leaves its tasks in the journal
    showing exactly how far it got.
    """

    def __init__(self, journal: Any, step: int) -> None:
        self.journal = journal
        self.step = step
        self._sequence = 0

    def declare(self, titles: list[str]) -> list[Task]:
        """Publish the plan before doing any of it.

        Declaring upfront is what lets the monitor draw the whole checklist
        immediately rather than growing it a row at a time — the difference
        between "3 done" and "3 of 5 done", which is the number a person
        watching actually wants.
        """
        tasks = []
        for title in titles:
            self._sequence += 1
            task = Task(id=f"{self.step:02d}.{self._sequence}", step=self.step, title=title)
            tasks.append(task)
            self._record(task)
        return tasks

    @contextmanager
    def run(self, task: Task) -> Iterator[Task]:
        """Mark a task running, then done or failed. Never leaves it running.

        The `finally` matters: a step that raises must not leave a task stuck at
        "running" forever, because a stuck row in the monitor is indistinguishable
        from a slow one.
        """
        started = time.monotonic()
        task.status = "running"
        self._record(task)
        try:
            yield task
        except Exception as exc:  # noqa: BLE001 - re-raised after recording
            task.status = "failed"
            task.detail = str(exc)[:300]
            task.duration_ms = int((time.monotonic() - started) * 1000)
            self._record(task)
            raise
        else:
            if task.status == "running":
                task.status = "done"
            task.duration_ms = int((time.monotonic() - started) * 1000)
            self._record(task)

    def skip(self, task: Task, reason: str) -> None:
        task.status = "skipped"
        task.detail = reason
        self._record(task)

    def _record(self, task: Task) -> None:
        self.journal.append_event(
            EVENT,
            step=task.step,
            task_id=task.id,
            title=task.title,
            status=task.status,
            detail=task.detail,
            duration_ms=task.duration_ms,
        )


def tasks_for_step(journal: Any, step: int) -> list[dict[str, Any]]:
    """Rebuild a step's task list from the journal.

    Last write wins per task id: the journal holds every transition, and what a
    reader wants is the current state of each task in declaration order.
    """
    latest: dict[str, dict[str, Any]] = {}
    order: list[str] = []

    for entry in journal.entries():
        if entry.get("event") != EVENT or entry.get("step") != step:
            continue
        task_id = entry.get("task_id")
        if task_id not in latest:
            order.append(task_id)
        latest[task_id] = {
            "id": task_id,
            "title": entry.get("title"),
            "status": entry.get("status"),
            "detail": entry.get("detail"),
            "durationMs": entry.get("duration_ms"),
        }
    return [latest[task_id] for task_id in order]
