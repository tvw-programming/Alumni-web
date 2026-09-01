"""The pipeline runner.

A plain, resumable Python loop - no graph framework at this layer. It walks steps
in order, consults the journal to skip completed work, blocks on gates, and
routes failures through config-declared remediation edges.

Resume semantics: everything the runner needs to continue is on disk (journal +
artifacts + gate decision files), so a killed process resumes with
`codegen-core resume <job_id>` and loses nothing except the in-flight step.
"""

from __future__ import annotations

from typing import Any

from ..core.bus import MessageBus
from ..core.component import Component, Kind
from ..core.envelope import Intent
from ..core.errors import BudgetExceeded, CodeGenCoreError, PipelineHalted, StepError
from ..core.ledger import StoryLedger, input_fingerprint
from ..core.parts import structured
from ..core.telemetry import log
from ..llm.factory import build_backends
from ..llm.router import LLMRouter
from ..plugins.factory import build_plugin
from ..steps._loader import load_steps
from .remediation import Remediation
from .retry import RetryPolicy


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

    # ------------------------------------------------------------------ #
    def prepare(self, ctx: Any) -> None:
        """Wire the per-job dependencies that need the journal to exist first."""
        backends = build_backends(self.cfg)
        ctx.router = LLMRouter(self.cfg, backends, ctx.journal)
        notifier = build_plugin(self.cfg, "notifier", ctx) if "notifier" in self.cfg.plugins else None
        self.remediation = Remediation(self.cfg, ctx.journal, notifier)
        self.notifier = notifier
        self.rehydrate(ctx)

    def rehydrate(self, ctx: Any) -> None:
        """Rebuild the typed store from artifacts already on disk.

        `ctx.store` lives in memory, so a run that resumes in a fresh process —
        which is every gate decision, since the deciding happens hours later —
        would otherwise hand each step an empty request. The journal says which
        schema a step emitted; the artifact index says which file currently
        holds it, and 'currently' matters: a BRD a human replaced at the gate
        supersedes the generated one, so this reads back the reviewer's.
        """
        # The live index once, rather than per step: it is a file read.
        current: dict[int, str] = {}
        for entry in ctx.artifacts.live_index():
            if entry["ext"] == "json":
                current[entry["step"]] = entry["file"]

        for record in ctx.journal.entries():
            if record.get("type") != "step":
                continue
            schemas = record.get("schemas") or []
            # One artifact holds one payload; a step emitting several schemas
            # cannot be reconstructed this way, so it is left alone.
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
        """Let a step put back whatever it set on the context beyond its payload."""
        component = self.registry.get(step)
        if component is not None:
            component.rehydrate(payload, ctx)

    def resume_point(self, ctx: Any) -> int:
        """The first step that has not completed.

        Not "the last recorded step plus one": a step can hold a record and be
        emphatically unfinished. A rejected gate is exactly that, and resuming
        past it would run the implementation steps against a document nobody
        approved. Completed steps are skipped by the loop anyway, so starting
        earlier costs nothing and starting later cannot be undone.
        """
        done = ctx.journal.completed_steps()
        for n in range(self.cfg.pipeline.start_step, self.cfg.pipeline.stop_step + 1):
            if n in self.registry and n not in done:
                return n
        return self.cfg.pipeline.stop_step + 1

    # ------------------------------------------------------------------ #
    def retry(self, ctx: Any, step: int, *, resume: bool = True) -> RunResult:
        """Re-run one failed step from the beginning, then carry on.

        Two halves, and both are deliberate. *Strictly that step* re-executes —
        the steps before it are complete and re-running them would burn tokens
        reproducing documents that are already correct. And once it succeeds the
        run continues, because the block existed on account of that step: a
        resolved failure that left the pipeline stopped would just need a second
        button.

        The retry itself ignores the ledger. A cached artifact is exactly what a
        failed step does not have, and a human pressing Retry is asking for the
        work to happen, not for a lookup.
        """
        self.prepare(ctx)
        component = self.registry.get(step)
        if component is None:
            raise PipelineHalted(step, f"step {step:02d} is not in this pipeline")

        ctx.journal.append_event("retry_started", step=step)
        try:
            env_out = self._execute(component, ctx, force=True)
        except (PipelineHalted, BudgetExceeded) as exc:
            return self._halt(ctx, step, str(exc))
        # Same breadth as the run loop, for the same reason: a retry that dies
        # on an unexpected exception must leave the step recorded as failed, not
        # as though it had never been attempted.
        except Exception as exc:  # noqa: BLE001 - recorded, then halted
            detail = self._describe(exc)
            ctx.journal.append_event("step_error", step=step, error=detail)
            return self._halt(ctx, step, f"retry of step {step:02d} failed: {detail}")

        if env_out.failed:
            return self._halt(ctx, step, f"retry of step {step:02d} failed with {env_out.status}")
        if not resume:
            return RunResult(ctx.job_id, ok=True)
        # Cleared. Pick the run back up wherever it now stands.
        return self.run(ctx, start=self.resume_point(ctx))

    # ------------------------------------------------------------------ #
    def run(self, ctx: Any, start: int | None = None, stop: int | None = None) -> RunResult:
        self.prepare(ctx)
        n = start or self.cfg.pipeline.start_step
        stop = stop or self.cfg.pipeline.stop_step
        ctx.journal.append_event("run_started", start=n, stop=stop, profile=self.cfg.active_profile)

        while n <= stop:
            step = self.registry.get(n)
            if step is None:
                n += 1
                continue
            if ctx.journal.completed(n):
                log.info("skipping completed step", extra={"extra_fields": {"step": n}})
                n += 1
                continue

            try:
                env_out = self._execute(step, ctx)
            except (PipelineHalted, BudgetExceeded) as exc:
                return self._halt(ctx, n, str(exc))
            # Anything else the step raised. Deliberately `Exception` and not
            # `CodeGenCoreError`: a pydantic ValidationError is a ValueError, so
            # the narrower clause let it escape the loop and kill the process
            # *before* the journal record was written at the end of _execute.
            # A step that leaves no record is indistinguishable from one still
            # working, so the monitor showed it as RUNNING for as long as anyone
            # cared to look. Recording the failure is what makes it a failure a
            # person can see, and retry.
            except Exception as exc:  # noqa: BLE001 - recorded, then routed
                ctx.journal.append_event(
                    "step_error", step=n, error=self._describe(exc)
                )
                try:
                    n = self.remediation.next_step(n, "FAILED", ctx)
                    continue
                except PipelineHalted as halt:
                    return self._halt(ctx, n, str(halt))

            # A gate with no decision yet is not a failure and has no edge to
            # take: it is the pipeline doing exactly what it is for. The run
            # stops, and whenever the human decides, that decision starts the
            # next one.
            if env_out.intent is Intent.GATE_WAIT:
                ctx.journal.append_event("gate_waiting", step=n)
                return RunResult(ctx.job_id, ok=True, halted_at=n, reason="waiting for a decision")

            if env_out.failed:
                try:
                    n = self.remediation.next_step(n, env_out.status, ctx)
                    continue
                except PipelineHalted as halt:
                    return self._halt(ctx, n, str(halt))
            n += 1

        ctx.journal.append_event("run_completed", cost_usd=ctx.journal.total_cost_usd())
        return RunResult(ctx.job_id, ok=True)

    # ------------------------------------------------------------------ #
    def _execute(self, step: Component, ctx: Any, *, force: bool = False):
        n = step.step
        ctx.policy.assert_preconditions(n, ctx)
        env_in = self.bus.build_request(step, ctx)

        # Taken before the step runs: it is a hash of what this step was handed,
        # and it has to mean the same thing on the lookup and on the record.
        fingerprint = self._fingerprint(step, ctx) if self._cacheable(step, ctx) else ""

        cached = None if force else self._replay_cached(step, ctx, env_in, fingerprint)
        if cached is not None:
            ctx.journal.append(env_in, cached)
            ctx.telemetry.emit(n, cached)
            return cached

        with ctx.telemetry.step_timer(n, step.name):
            if step.kind is Kind.GATE:
                env_out = step.handle(env_in, ctx)          # gates never retry
            else:
                env_out = self.retry_policy.call(step.handle, n, env_in, ctx)

        ctx.journal.append(env_in, env_out)
        ctx.telemetry.emit(n, env_out)
        ctx.policy.assert_budget()
        if fingerprint and not env_out.failed:
            self._remember_in_ledger(step, ctx, env_out, fingerprint)
        return env_out

    # ------------------------------------------------------------------ #
    def _cacheable(self, step: Component, ctx: Any) -> bool:
        """Whether this step may be answered from a previous run of the story.

        Three exclusions, each for its own reason:

        * **Gates.** Replaying a stored approval would let a decision taken last
          week stand in for a document a human has not seen. The two gates
          always run, and always wait for a person.
        * **Step 01.** It costs no tokens, and it is where a changed ticket
          enters the run — caching it would hide an edited story from everything
          downstream. Its output carries `source_checksum`, which is precisely
          what makes every later step's key invalidate when the ticket changes.
        * **A story we cannot name.** No key, no ledger.
        """
        if step.kind is Kind.GATE or step.step == self.cfg.pipeline.start_step:
            return False
        return bool(self._story_key(ctx))

    def _story_key(self, ctx: Any) -> str:
        """The story number the ledger is filed under.

        Read from the story artifact rather than from the job id: a job id is
        minted fresh per run and carries a configured prefix, while the ticket
        key is the thing two runs of the same story actually share.
        """
        story = ctx.recall("JiraStoryV1") or {}
        return str(story.get("key") or ctx.jira_id or "")

    def _fingerprint(self, step: Component, ctx: Any) -> str:
        return input_fingerprint(list(getattr(step, "consumes", [])), ctx.store)

    def _replay_cached(self, step: Component, ctx: Any, env_in: Any, fingerprint: str):
        """A finished envelope from the ledger, or None to run the step for real."""
        if not fingerprint:
            return None

        ledger = StoryLedger(self.cfg, self._story_key(ctx))
        entry = ledger.lookup(step.step, fingerprint)
        if entry is None:
            return None

        try:
            ledger.replay(ctx, entry)
        except (OSError, KeyError) as exc:
            # The artifacts were moved or purged. Losing the saving is fine;
            # pretending the step ran is not.
            log.info("cached artifacts unusable, running the step",
                     extra={"extra_fields": {"step": step.step, "error": str(exc)}})
            return None

        schemas = list(entry.get("schemas") or [])
        payload = entry.get("payload")
        parts = []
        if len(schemas) == 1 and isinstance(payload, dict):
            ctx.remember(schemas[0], payload)
            # A skipped step still has to leave the context as if it ran, or
            # step 12 finds no Impact Manifest and refuses to write.
            step.rehydrate(payload, ctx)
            parts.append(structured(schemas[0], payload))

        ctx.journal.append_event(
            "step_cached", step=step.step, from_job=entry["job_id"],
            input_sha=fingerprint, artifacts=[a["file"] for a in entry["artifacts"]],
        )
        log.info("step served from the story ledger",
                 extra={"extra_fields": {"step": step.step, "story": self._story_key(ctx)}})
        return env_in.reply(step.ref(), parts, status="OK").model_copy(update={"parts": parts})

    def _remember_in_ledger(self, step: Component, ctx: Any, env_out: Any, fingerprint: str) -> None:
        schemas = env_out.schema_ids()
        StoryLedger(self.cfg, self._story_key(ctx)).record(
            ctx, step.step, fingerprint, schemas,
            payload=ctx.recall(schemas[0]) if len(schemas) == 1 else None,
        )

    @staticmethod
    def _describe(exc: Exception) -> str:
        """A one-line reason a reader can act on.

        `str(exc)` alone is enough for the errors this codebase raises: they are
        written to be read, and prefixing them with a class name would only add
        noise to a sentence that already reads as one. It is not enough for the
        ones this codebase merely propagates — a bare pydantic ValidationError
        prints a multi-line report whose first line does not name the exception,
        and an IndexError prints nothing at all. Those get their type in front,
        so the journal says what kind of thing went wrong even when the message
        is empty.
        """
        text = " ".join(str(exc).split())
        if isinstance(exc, CodeGenCoreError):
            return text
        if not text:
            return type(exc).__name__
        return f"{type(exc).__name__}: {text[:500]}"

    def _halt(self, ctx: Any, step: int, reason: str) -> RunResult:
        ctx.journal.append_event("run_halted", step=step, reason=reason)
        log.error("pipeline halted", extra={"extra_fields": {"step": step, "reason": reason}})
        if getattr(self, "notifier", None):
            self.notifier.send("pipeline_halted", f"job {ctx.job_id} halted at step {step:02d}: {reason}")
        return RunResult(ctx.job_id, ok=False, halted_at=step, reason=reason)
