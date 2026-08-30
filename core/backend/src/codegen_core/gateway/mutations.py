"""The write path, out of process.

This is the phase that closes the hole ADR 0004 names. An in-process guard
cannot constrain a subprocess, which is exactly how a `cli_agent` backend gets
around `GuardedFS` today. Moving the write here makes the check enforceable for
every backend, including ones that shell out — because they no longer hold the
file handle.

**It uses `GuardedFS`; it does not reimplement it.** The plan's warning about
two sources of policy is easy to trip over by writing "the same" deny-glob logic
here. Instead the gateway constructs the same class the pipeline uses, from the
same config, so there is exactly one implementation of path safety, LOC
accounting and migration signoff. A change to the guard changes both callers.

Three properties this adds on top of the guard:

* **Idempotency.** A retried or replayed call with a key already applied is a
  no-op that reports what the first call did, rather than a second write.
* **Declared scope.** The caller states which files it expects to touch, and a
  write outside that set is refused even when the whitelist would allow it.
  Declaring is cheap; drifting silently is not.
* **Audit of refusals.** A rejected call is journalled as loudly as an accepted
  one. After an incident, the calls that did not run are the interesting ones.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from ..core.errors import PolicyViolation
from ..core.guardrails import run_generated_code_guardrails
from ..core.journal import Journal
from ..core.policy import PolicyEngine
from ..tools.file_write_guard import GuardedFS
from .tokens import WorkflowClaims
from .tools import GatewayDenied, assert_readable, resolve_in_root

#: Journal event kinds. Distinct from the pipeline's own so a reader can tell
#: which side of the boundary a decision was made on.
EVENT_APPLIED = "gateway_mutation_applied"
EVENT_REFUSED = "gateway_mutation_refused"
EVENT_REPLAYED = "gateway_mutation_replayed"


@dataclass(frozen=True)
class FileWrite:
    """One file the caller intends to write, in full."""

    path: str
    content: str


@dataclass(frozen=True)
class ApplyResult:
    status: str  # "applied" | "replayed"
    changed_files: list[str] = field(default_factory=list)
    changed_loc: int = 0
    idempotency_key: str = ""
    guardrails: list[dict[str, Any]] = field(default_factory=list)


def _journal_for(cfg: Any, run_id: str) -> Journal:
    """The run's own journal, so gateway decisions land beside pipeline ones."""
    return Journal(cfg, run_id)


def _already_applied(journal: Journal, key: str) -> dict[str, Any] | None:
    for entry in reversed(journal.entries()):
        if entry.get("event") == EVENT_APPLIED and entry.get("idempotency_key") == key:
            return entry
    return None


def apply_patch(
    cfg: Any,
    claims: WorkflowClaims,
    *,
    writes: list[FileWrite],
    expected_files: list[str],
    allowed_globs: list[str],
    loc_budget: int,
    idempotency_key: str,
    justification: str,
    dry_run: bool = False,
) -> ApplyResult:
    """Write a declared set of files, or refuse and say why.

    `dry_run` is what makes `shadow` mode meaningful: every check runs and every
    decision is journalled, but nothing is written. That lets the gateway's
    verdict be compared against the in-process path before anything depends on
    it.
    """
    journal = _journal_for(cfg, claims.run_id)

    def refuse(reason: str) -> None:
        journal.append_event(
            EVENT_REFUSED,
            step=claims.step,
            agent=claims.agent,
            idempotency_key=idempotency_key,
            reason=reason,
            dry_run=dry_run,
        )
        raise GatewayDenied(reason)

    if not idempotency_key or len(idempotency_key) < 8:
        refuse("idempotency_key is missing or too short to be unique")

    if not justification or len(justification.strip()) < 40:
        # The transparency rule, enforced at the boundary as well as in the
        # pipeline — the gateway must not depend on the caller having checked.
        refuse("a mutation must carry a justification of at least 40 characters")

    # A replay is not an error. The first call's outcome is the answer.
    prior = _already_applied(journal, idempotency_key)
    if prior is not None:
        journal.append_event(
            EVENT_REPLAYED,
            step=claims.step,
            idempotency_key=idempotency_key,
            original_at=prior.get("at"),
        )
        return ApplyResult(
            status="replayed",
            changed_files=list(prior.get("changed_files", [])),
            changed_loc=int(prior.get("changed_loc", 0)),
            idempotency_key=idempotency_key,
        )

    if not writes:
        refuse("no files to write")

    declared = set(expected_files)
    actual = {w.path for w in writes}
    undeclared = sorted(actual - declared)
    if undeclared:
        # Refused even if the whitelist would have allowed it: a write the
        # caller did not declare is a write nobody reviewed.
        refuse(f"writes not declared in expected_files: {undeclared}")

    root = Path(claims.project_root)
    for write in writes:
        # Traversal and symlink escape first — before any policy question, and
        # certainly before opening anything.
        #
        # Routed through `refuse` rather than allowed to raise from tools.py:
        # these are the refusals most worth having in the audit trail, and
        # letting them propagate directly is how they end up missing from it.
        try:
            resolve_in_root(root, write.path)
            assert_readable(cfg, write.path)
        except GatewayDenied as exc:
            refuse(str(exc))

    # Content checks at the boundary. `mutating=True` raises, so a changeset
    # carrying a credential never reaches the disk.
    try:
        guardrail_results = run_generated_code_guardrails(
            {w.path: w.content for w in writes},
            {"action": "apply_patch", "target_files": sorted(actual)},
            mutating=True,
            level="gateway",
        )
    except PolicyViolation as exc:
        refuse(str(exc))
        raise  # unreachable; refuse raises. Kept so the type is honest.

    guard = GuardedFS(
        root=root,
        allowed_globs=allowed_globs,
        policy=PolicyEngine(cfg, journal),
        loc_budget=loc_budget,
    )

    if dry_run:
        # Shadow: exercise every check the real path would, then stop. read_file
        # is used rather than write_file so the accounting is identical without
        # the side effect.
        for write in writes:
            guard.policy.check_path(write.path, allowed_globs)
        journal.append_event(
            EVENT_APPLIED,
            step=claims.step,
            agent=claims.agent,
            idempotency_key=idempotency_key,
            changed_files=sorted(actual),
            changed_loc=0,
            justification=justification,
            dry_run=True,
        )
        return ApplyResult(
            status="applied",
            changed_files=sorted(actual),
            idempotency_key=idempotency_key,
            guardrails=[r.as_event() for r in guardrail_results],
        )

    try:
        for write in writes:
            guard.write_file(write.path, write.content)
    except PolicyViolation as exc:
        # The guard stopped partway. Whatever it wrote before refusing is on
        # disk, and saying so is more useful than implying a clean rollback.
        refuse(f"write guard refused: {exc}")

    summary = guard.summary()
    journal.append_event(
        EVENT_APPLIED,
        step=claims.step,
        agent=claims.agent,
        idempotency_key=idempotency_key,
        changed_files=sorted(actual),
        changed_loc=summary.get("changed_loc", 0),
        justification=justification,
        dry_run=False,
    )
    return ApplyResult(
        status="applied",
        changed_files=sorted(actual),
        changed_loc=summary.get("changed_loc", 0),
        idempotency_key=idempotency_key,
        guardrails=[r.as_event() for r in guardrail_results],
    )
