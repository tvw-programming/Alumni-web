# ADR 0004 — MCP is the first enforceable boundary, not a second layer

**Status:** Accepted · **Date:** 2026-08 · **Relates to:** ADR 0003

## Context

The integration proposal frames an MCP gateway as "Level 2" guardrails sitting
behind in-process "Level 1" guardrails — a compliance layer over a system already
safe. That framing is wrong about this codebase in one specific way, and the
difference decides how much the gateway is worth.

`GuardedFS` (`tools/file_write_guard.py`) enforces, in order: path inside the
workspace, not matching a deny glob, matching the step-09 whitelist, inside the
file and LOC budget, migrations blocked without human signoff. Every write an
*in-process* agent performs goes through it.

The exception is documented in the module's own docstring and in CLAUDE.md:

> a `cli_agent` backend with `edits_files_directly=true` writes to disk itself
> and never calls this class. For those, `audit_changeset()` performs the same
> checks AFTER the fact, against the resulting diff.

Two backends are configured that way — `devtool.cursor` and `devtool.copilot`
— both currently `enabled: false`.

## Decision

The MCP gateway is adopted as **the enforcement boundary for repository
mutation**, not as a redundant second check. Its first-class justification is
closing the `cli_agent` bypass, and the rollout is ordered accordingly:
read-only tools first, then `repo.apply_patch`, then routing `cli_agent` through
it or dropping `edits_files_directly` entirely.

Additionally: **the gateway loads `config.policy.write_scope` rather than
restating it.** Deny globs, file caps and LOC budgets have exactly one
definition.

## Reasoning

An in-process guard cannot constrain a subprocess. That is not a gap in
`GuardedFS`'s implementation; it is the boundary of what an in-process guard can
do. `audit_changeset()` is honest about being weaker — the unwanted edit exists
on disk by the time it runs, it is merely uncommitted.

Moving mutation out of process is what makes the check enforceable for a backend
that shells out. That is a real security property, and it is a better reason to
run a gateway than "defence in depth", which invites the two-sources-of-policy
failure: a gateway that reimplements deny globs drifts from the config, and the
weaker of the two wins silently.

Deferring the decision was considered. Rejected because the bypass is
load-bearing on a config flag — enabling `devtool.cursor` today removes the
whitelist enforcement with no code change and no warning.

## Consequences

**Good.** One enforceable boundary for every backend. A single source of policy.
The `cli_agent` bypass closes rather than being documented indefinitely.

**Bad.** A new process, a new deployment surface, a new failure mode. Mitigated
by the rollout order — read-only first — and by the outage rule below.

**Non-negotiable, whatever the rollout state:**

- Steps 06 and 24 stay unremovable. No gateway path may reach around them.
- Reviewer isolation holds. Steps 13 and 23 never run on the model that wrote
  12 and 15, and the gateway must not become a way to launder that.
- **A gateway outage pauses the run.** It must never fall back to the direct
  path. A bypass that activates under failure is not a boundary — it is a
  boundary that disappears exactly when something is going wrong.
