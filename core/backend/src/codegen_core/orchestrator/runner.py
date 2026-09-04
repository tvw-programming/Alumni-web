"""The pipeline runner.

A plain, resumable Python loop — no graph framework at this layer. It walks
steps in order, fans out `pipeline.parallel_groups` with a consumes/emits DAG
barrier, consults the journal to skip completed work, blocks on gates, and
routes failures through config-declared edges and typed failure-class routes.

Concurrency uses stdlib `concurrent.futures` (WaitGroup / errgroup equivalent).
"""

from __future__ import annotations

import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from ..core.bus import MessageBus
from ..core.component import Component, Kind
from ..core.envelope import Intent, failure_class_for
from ..core.errors import BudgetExceeded, CodeGenCoreError, PipelineHalted
from ..core.ledger import StoryLedger, input_fingerprint
from ..core.parts import structured
from ..core.telemetry import log
from ..core.tracing import RUN_ID
from ..llm.factory import build_backends
from ..llm.router import LLMRouter
from ..plugins.factory import build_plugin
from ..steps._loader import load_steps
from .remediation import Remediation
from .retry import RetryPolicy

PARALLEL_GROUP_STEPS = "codegen.parallel.steps"


class RunResult:
    def __init__(self, job_id: str, ok: bool, halted_at: int | None = None, reason: str = "") -> None:
        self.job_id = job_id
        self.ok = ok
        self.halted_at = halted_at
        self.reason = reason

    def __repr__(self) -> str:  # pragma: no cover - display only
        state = "completed" if self.ok else f"halted at {self.halted_at:02d} ({self.reason})"
        return f"<RunResult {self.job_id} {state}>"


class PipelineRunner:
    def __init__(self, cfg: Any, registry: dict[int, Component] | None = None) -> None:
        self.cfg = cfg
        self.registry = registry or load_steps(cfg)
        self.bus = MessageBus(cfg)
        self.retry_policy = RetryPolicy(cfg)
        self._io_lock = threading.RLock()
        self._group_of = self._build_group_index(cfg.pipeline.parallel_groups)

    @staticmethod
    def _build_group_index(groups: list[list[int]]) -> dict[int, tuple[int, ...]]:
        index: dict[int, tuple[int, ...]] = {}
        for group in groups:
            keyed = tuple(sorted(group))
            for step in keyed:
                index[step] = keyed
        return index

    def _max_parallel(self) -> int:
        override = self.cfg.pipeline.max_parallel_steps
        if override is not None:
            return max(1, override)
        return max(1, self.cfg.app.concurrency.max_parallel_steps)

    # ------------------------------------------------------------------ #
    def prepare(self, ctx: Any) -> None:
        backends = build_backends(self.cfg)
        ctx.router = LLMRouter(self.cfg, backends, ctx.journal)
        notifier = build_plugin(self.cfg, "notifier", ctx) if "notifier" in self.cfg.plugins else None
        self.remediation = Remediation(self.cfg, ctx.journal, notifier)
        self.notifier = notifier
        self._guard_journal(ctx.journal)
        self.rehydrate(ctx)

    def _guard_journal(self, journal: Any) -> None:
        if getattr(journal, "_parallel_guarded", False):
            return
        lock = self._io_lock
        original = journal._append

        def _append(record: dict) -> None:
            with lock:
                original(record)

        journal._append = _append  # type: ignore[method-assign]
        journal._parallel_guarded = True  # type: ignore[attr-defined]

    def rehydrate(self, ctx: Any) -> None:
        current: dict[int, str] = {}
        for entry in ctx.artifacts.live_index():
            if entry["ext"] == "json":
                current[entry["step"]] = entry["file"]

        for record in ctx.journal.entries():
            if record.get("type") != "step":
                continue
            schemas = record.get("schemas") or []
            if len(schemas) != 1 or record.get("step") not in current:
                continue
            try:
                data = ctx.artifacts.read_json(current[record["step"]])
            except (OSError, ValueError):
                continue
            if isinstance(data, dict):
                ctx.remember(schemas[0], data)
                self._restore_context(record["step"], data, ctx)

    def _restore_context(self, step: int, payload: dict, ctx: Any) -> None:
        component = self.registry.get(step)
        if component is not None:
            component.rehydrate(payload, ctx)

    def resume_point(self, ctx: Any) -> int:
        done = ctx.journal.completed_steps()
        for n in range(self.cfg.pipeline.start_step, self.cfg.pipeline.stop_step + 1):
            if n in self.registry and n not in done:
                return n
        return self.cfg.pipeline.stop_step + 1

    # ------------------------------------------------------------------ #
    def retry(self, ctx: Any, step: int, *, resume: bool = True) -> RunResult:
        self.prepare(ctx)
        component = self.registry.get(step)
        if component is None:
            raise PipelineHalted(step, f"step {step:02d} is not in this pipeline")

        ctx.journal.append_event("retry_started", step=step)
        try:
            env_out = self._execute(component, ctx, force=True)
        except (PipelineHalted, BudgetExceeded) as exc:
            return self._halt(ctx, step, str(exc))
        except Exception as exc:  # noqa: BLE001
            detail = self._describe(exc)
            ctx.journal.append_event("step_error", step=step, error=detail)
            return self._halt(ctx, step, f"retry of step {step:02d} failed: {detail}")

        if env_out.failed:
            return self._halt(ctx, step, f"retry of step {step:02d} failed with {env_out.status}")
        if not resume:
            return RunResult(ctx.job_id, ok=True)
        return self.run(ctx, start=self.resume_point(ctx))

    # ------------------------------------------------------------------ #
    def run(self, ctx: Any, start: int | None = None, stop: int | None = None) -> RunResult:
        self.prepare(ctx)
        n = start or self.cfg.pipeline.start_step
        stop = stop or self.cfg.pipeline.stop_step
        ctx.journal.append_event("run_started", start=n, stop=stop, profile=self.cfg.active_profile)

        with ctx.telemetry.tracing.run_span(ctx.job_id):
            while n <= stop:
                step = self.registry.get(n)
                if step is None:
                    n += 1
                    continue
                if ctx.journal.completed(n):
                    log.info(
                        "skipping completed step",
                        extra={"extra_fields": {"workflow_id": ctx.job_id, "step": n}},
                    )
                    n += 1
                    continue

                pending = self._pending_parallel_peers(n, stop, ctx)
                if pending is not None:
                    outcome = self._run_parallel_group(pending, ctx)
                    if isinstance(outcome, RunResult):
                        return outcome
                    n = outcome
                    continue

                outcome = self._run_one(step, n, ctx)
                if isinstance(outcome, RunResult):
                    return outcome
                n = outcome

        ctx.journal.append_event("run_completed", cost_usd=ctx.journal.total_cost_usd())
        return RunResult(ctx.job_id, ok=True)

    def _pending_parallel_peers(self, n: int, stop: int, ctx: Any) -> list[int] | None:
        group = self._group_of.get(n)
        if group is None:
            return None
        pending = [
            s for s in group
            if s <= stop and s in self.registry and not ctx.journal.completed(s)
        ]
        if len(pending) < 2 or n != pending[0]:
            return None
        return pending

    def _sibling_emitters(self, pending: list[int]) -> dict[str, int]:
        """Map schema id → step for schemas emitted by still-pending siblings."""
        emitters: dict[str, int] = {}
        for s in pending:
            emits = getattr(self.registry[s], "emits", "") or ""
            if emits:
                emitters[emits] = s
        return emitters

    def _ready_wave(self, pending: list[int], ctx: Any) -> list[int]:
        """DAG barrier: a step is ready if no incomplete sibling produces a consume it lacks."""
        emitters = self._sibling_emitters(pending)
        ready: list[int] = []
        for s in pending:
            consumes = list(getattr(self.registry[s], "consumes", []) or [])
            blocked = False
            for schema in consumes:
                if ctx.recall(schema) is not None:
                    continue
                producer = emitters.get(schema)
                if producer is not None and producer != s and producer in pending:
                    blocked = True
                    break
            if not blocked:
                ready.append(s)
        # Progress guarantee: if everything waits on a sibling, run the earliest alone.
        return ready or pending[:1]

    def _run_one(self, step: Component, n: int, ctx: Any) -> RunResult | int:
        try:
            env_out = self._execute(step, ctx)
        except (PipelineHalted, BudgetExceeded) as exc:
            return self._halt(ctx, n, str(exc))
        except Exception as exc:  # noqa: BLE001
            ctx.journal.append_event("step_error", step=n, error=self._describe(exc))
            # Crashes are not typed domain failures — do not invent a class route.
            try:
                return self.remediation.next_step(
                    n, "FAILED", ctx, env=None, use_class_routes=False
                )
            except PipelineHalted as halt:
                return self._halt(ctx, n, str(halt))

        if env_out.intent is Intent.GATE_WAIT:
            ctx.journal.append_event("gate_waiting", step=n)
            return RunResult(ctx.job_id, ok=True, halted_at=n, reason="waiting for a decision")

        if env_out.failed:
            return self._remediate(n, env_out.status, ctx, env=env_out)
        return n + 1

    def _remediate(self, n: int, status: str, ctx: Any, *, env: Any) -> RunResult | int:
        try:
            return self.remediation.next_step(n, status, ctx, env=env)
        except PipelineHalted as halt:
            return self._halt(ctx, n, str(halt))

    def _run_parallel_group(self, steps: list[int], ctx: Any) -> RunResult | int:
        cap = self._max_parallel()
        ctx.journal.append_event(
            "parallel_group_started",
            steps=list(steps),
            max_workers=cap,
            workflow_id=ctx.job_id,
        )

        tracing = ctx.telemetry.tracing
        remaining = list(steps)
        with tracing.span(
            "workflow.parallel_group",
            **{RUN_ID: ctx.job_id, PARALLEL_GROUP_STEPS: ",".join(str(s) for s in steps)},
        ):
            while remaining:
                wave = self._ready_wave(remaining, ctx)
                # Honour global concurrency cap across the wave.
                batch = wave[:cap]
                remaining = [s for s in remaining if s not in batch]

                log.info(
                    "parallel wave",
                    extra={
                        "extra_fields": {
                            "workflow_id": ctx.job_id,
                            "steps": batch,
                            "max_parallel_steps": cap,
                        }
                    },
                )
                results = self._execute_batch(batch, ctx)

                for n in batch:
                    kind, payload = results[n]
                    if kind == "halt":
                        return payload
                if kind == "exc":
                    ctx.journal.append_event(
                        "step_error", step=n, error=self._describe(payload)
                    )
                    try:
                        return self.remediation.next_step(
                            n, "FAILED", ctx, env=None, use_class_routes=False
                        )
                    except PipelineHalted as halt:
                        return self._halt(ctx, n, str(halt))

                    env_out = payload
                    if env_out.intent is Intent.GATE_WAIT:
                        ctx.journal.append_event("gate_waiting", step=n)
                        return RunResult(
                            ctx.job_id, ok=True, halted_at=n, reason="waiting for a decision"
                        )
                    if env_out.failed:
                        return self._remediate(n, env_out.status, ctx, env=env_out)

        ctx.journal.append_event("parallel_group_finished", steps=list(steps))
        return max(steps) + 1

    def _execute_batch(self, batch: list[int], ctx: Any) -> dict[int, tuple[str, Any]]:
        if len(batch) == 1:
            n = batch[0]
            try:
                return {n: ("ok", self._execute(self.registry[n], ctx))}
            except (PipelineHalted, BudgetExceeded) as exc:
                return {n: ("halt", self._halt(ctx, n, str(exc)))}
            except Exception as exc:  # noqa: BLE001
                return {n: ("exc", exc)}

        out: dict[int, tuple[str, Any]] = {}
        with ThreadPoolExecutor(max_workers=len(batch)) as pool:
            futures = {
                pool.submit(self._execute, self.registry[n], ctx): n for n in batch
            }
            for fut in as_completed(futures):
                n = futures[fut]
                try:
                    out[n] = ("ok", fut.result())
                except (PipelineHalted, BudgetExceeded) as exc:
                    out[n] = ("halt", self._halt(ctx, n, str(exc)))
                except Exception as exc:  # noqa: BLE001
                    out[n] = ("exc", exc)
        return out

    # ------------------------------------------------------------------ #
    def _execute(self, step: Component, ctx: Any, *, force: bool = False):
        n = step.step
        with self._io_lock:
            ctx.policy.assert_preconditions(n, ctx)
            env_in = self.bus.build_request(step, ctx)
            # Surface prior remediation context to the code / lint / test steps.
            rem = ctx.store.get("_remediation_context")
            if rem and n in (12, 14, 15):
                env_in = env_in.model_copy(
                    update={"parts": list(env_in.parts) + [structured("RemediationContextV1", rem)]}
                )
            if n == 12:
                from ..core.envelope import FailurePayload
                from ..steps.step12.failures import prior_failures_from_ctx

                prior = prior_failures_from_ctx(ctx, limit=3)
                if rem and rem.get("prior_failures"):
                    prior = [FailurePayload.model_validate(p) for p in rem["prior_failures"][-3:]]
                env_in = env_in.model_copy(
                    update={
                        "prior_failures": prior,
                        "remediation_source": (rem or {}).get("remediation_source") or (
                            "FAILURE_CLASS" if rem else "MANUAL"
                        ),
                        "loop_budget": int(getattr(self.cfg.pipeline, "loop_budget", 3) or 3),
                        "loop_count": ctx.journal.code_fix_loop_count(),
                    }
                )
            fingerprint = self._fingerprint(step, ctx) if self._cacheable(step, ctx) else ""
            cached = None if force else self._replay_cached(step, ctx, env_in, fingerprint)
            if cached is not None:
                ctx.journal.append(env_in, cached)
                ctx.telemetry.emit(n, cached)
                return cached

        risk = self.cfg.step_cfg(n).risk_level if hasattr(self.cfg, "step_cfg") else "low"
        with ctx.telemetry.step_timer(n, step.name, kind=step.kind.value, risk=risk):
            if step.kind is Kind.GATE:
                env_out = step.handle(env_in, ctx)
            else:
                env_out = self.retry_policy.call(step.handle, n, env_in, ctx)

        if env_out.failed and env_out.failure_class is None:
            env_out = env_out.model_copy(update={"failure_class": failure_class_for(n, env_out)})

        with self._io_lock:
            ctx.journal.append(env_in, env_out)
            ctx.telemetry.emit(n, env_out)
            ctx.policy.assert_budget()
            if fingerprint and not env_out.failed:
                self._remember_in_ledger(step, ctx, env_out, fingerprint)
            log.info(
                "step recorded",
                extra={
                    "extra_fields": {
                        "workflow_id": ctx.job_id,
                        "step": n,
                        "trace_id": env_out.trace_id,
                        "failure_class": (
                            env_out.failure_class.value if env_out.failure_class else None
                        ),
                        "status": env_out.status,
                    }
                },
            )
        return env_out

    # ------------------------------------------------------------------ #
    def _cacheable(self, step: Component, ctx: Any) -> bool:
        if step.kind is Kind.GATE or step.step == self.cfg.pipeline.start_step:
            return False
        return bool(self._story_key(ctx))

    def _story_key(self, ctx: Any) -> str:
        story = ctx.recall("JiraStoryV1") or {}
        return str(story.get("key") or ctx.jira_id or "")

    def _fingerprint(self, step: Component, ctx: Any) -> str:
        return input_fingerprint(list(getattr(step, "consumes", [])), ctx.store)

    def _replay_cached(self, step: Component, ctx: Any, env_in: Any, fingerprint: str):
        if not fingerprint:
            return None

        ledger = StoryLedger(self.cfg, self._story_key(ctx))
        entry = ledger.lookup(step.step, fingerprint)
        if entry is None:
            return None

        try:
            ledger.replay(ctx, entry)
        except (OSError, KeyError) as exc:
            log.info(
                "cached artifacts unusable, running the step",
                extra={"extra_fields": {"step": step.step, "error": str(exc)}},
            )
            return None

        schemas = list(entry.get("schemas") or [])
        payload = entry.get("payload")
        parts = []
        if len(schemas) == 1 and isinstance(payload, dict):
            ctx.remember(schemas[0], payload)
            step.rehydrate(payload, ctx)
            parts.append(structured(schemas[0], payload))

        ctx.journal.append_event(
            "step_cached",
            step=step.step,
            from_job=entry["job_id"],
            input_sha=fingerprint,
            artifacts=[a["file"] for a in entry["artifacts"]],
        )
        return env_in.reply(step.ref(), parts, status="OK").model_copy(update={"parts": parts})

    def _remember_in_ledger(self, step: Component, ctx: Any, env_out: Any, fingerprint: str) -> None:
        schemas = env_out.schema_ids()
        StoryLedger(self.cfg, self._story_key(ctx)).record(
            ctx,
            step.step,
            fingerprint,
            schemas,
            payload=ctx.recall(schemas[0]) if len(schemas) == 1 else None,
        )

    @staticmethod
    def _describe(exc: Exception) -> str:
        text = " ".join(str(exc).split())
        if isinstance(exc, CodeGenCoreError):
            return text
        if not text:
            return type(exc).__name__
        return f"{type(exc).__name__}: {text[:500]}"

    def _halt(self, ctx: Any, step: int, reason: str) -> RunResult:
        ctx.journal.append_event("run_halted", step=step, reason=reason)
        log.error(
            "pipeline halted",
            extra={"extra_fields": {"workflow_id": ctx.job_id, "step": step, "reason": reason}},
        )
        if getattr(self, "notifier", None):
            self.notifier.send(
                "pipeline_halted",
                f"job {ctx.job_id} halted at step {step:02d}: {reason}",
            )
        return RunResult(ctx.job_id, ok=False, halted_at=step, reason=reason)
