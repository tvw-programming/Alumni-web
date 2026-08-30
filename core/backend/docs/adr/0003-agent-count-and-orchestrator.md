# ADR 0003 — Fifteen agents, and the runner stays the orchestrator

**Status:** Accepted · **Date:** 2026-08 · **Relates to:** ADR 0001

## Context

An integration proposal described the current system as "already implemented in
LangChain with Deep Agent" orchestrating "9 separate agents", and planned an MCP
gateway on that basis. Neither statement matches the tree, and both change what
the work is.

Read from the registry rather than from documentation:

| Kind | Count | Steps |
|---|---:|---|
| AGENT | **15** | 02 03 04 05 07 08 09 10 11 12 13 15 20 21 23 |
| PLUGIN | 6 | 01 16 17 18 19 22 |
| TOOL | 1 | 14 |
| GATE | 2 | 06 24 |

Nine is the number of steps routed to the `reasoning` capability (02 03 04 05 07
10 13 20 23). It is a routing fact, not an agent roster.

Orchestration is `orchestrator/runner.py` — a resumable `while` loop, about 300
lines. LangChain appears only as chat-model adapters inside five drivers in
`llm/backends/`, each behind a lazy import. `deepagents` is used in exactly one
place, step 12's agentic loop, and that step has a working fallback when the
package is absent.

## Decision

**1. There are fifteen agents.** Policy profiles are written per *step*, not per
capability. A profile set written for nine would leave six agents unpoliced —
including step 12, the only step that writes code.

**2. `orchestrator/runner.py` remains the workflow authority.** Where a
specification says "Deep Agent", read it as the runner. We adopt the proposal's
*contracts* — `ActionIntent`, per-step policy profiles, the two-level guardrail
split — none of which require a graph framework.

## Reasoning

Adopting LangChain's Deep Agent as the orchestrator would supersede ADR 0001 and
rewrite the file the system's legibility rests on. ADR 0001's argument still
holds: the control flow is "walk 1→24, on failure consult a table", and that is
reviewable in one sitting as a loop plus a JSON table.

Nothing in the proposal needs a graph. `ActionIntent` is a pydantic model. Policy
profiles are config plus a check in `PolicyEngine`. The guardrail split is two
call sites. Taking the contracts without the framework gets the safety properties
and keeps the reviewability.

Grouping fifteen agents into nine roles was considered and rejected: the grouping
would exist only to match a number in a document, and every policy question —
which files may this step write, what actions may it take — is answered per step,
not per group.

## Consequences

**Good.** Policy coverage is total. ADR 0001 stands unamended. Contracts land
without a framework migration.

**Bad.** Fifteen profiles to author and maintain rather than nine. Mitigated by
deny-by-default: a step with no declared actions may only read, so an
unmaintained profile fails safe.

**Revisit when** a requirement appears that the loop genuinely cannot express —
concurrent step execution with join semantics, or dynamic step generation. Then
supersede ADR 0001 deliberately, not incidentally.
