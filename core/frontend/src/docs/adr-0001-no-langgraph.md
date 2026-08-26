# ADR 0001 — No hand-authored LangGraph

**Status:** Accepted · **Date:** 2026-08 · **Supersedes:** none

## Context

The pipeline has 24 sequential steps and nine failure edges. LangGraph is the
obvious candidate for expressing that, and the requirement explicitly said not
to use it — so this ADR records the reasoning rather than just the instruction,
and is honest about what we could not avoid.

## Decision

We author **zero** graph, node, edge or state-machine code. Orchestration is a
plain resumable `while` loop in `orchestrator/runner.py`, and the failure
topology is a table in `config.pipeline.remediation_edges`.

**We do not claim LangGraph is absent from the dependency tree.** `deepagents`
depends on it transitively, and step 12 uses `deepagents` for the agentic loop
when it is installed. Claiming otherwise would be false, and a reviewer running
`pip list` would find out.

## Reasoning

**Legibility.** The control flow is "walk 1→24, on failure consult a table". As
a loop plus a JSON table, you read it in one sitting and a topology change is a
one-line diff someone can review. As a graph, the same logic spreads across node
definitions, conditional edge functions and a state schema — and reviewing a
change means reconstructing the graph in your head.

**The topology is data.** Because remediation lives in config, `codegen-core config`
can print it, a test can assert it, and an operations team can widen a loop
budget without a deploy. Encoded as graph edges it would be code.

**Resumption is simpler than checkpointing.** Everything needed to resume is
already on disk for audit reasons: the journal, the artifacts, the gate decision
files. `codegen-core resume` re-derives position from the journal. A checkpointer
would be a second, redundant source of truth for state we already persist.

**Gates are blocking waits, not graph states.** A human gate blocks on a file
appearing. Expressing that as an interrupt/resume cycle adds machinery around
`while not path.exists()`.

## Consequences

**Good.** The runner is ~40 lines. Topology changes are config. No framework
version pinned to our control flow. Steps are testable in isolation — construct
an envelope, call `handle`, assert on the envelope back.

**Bad.** We hand-rolled resumption, retry and remediation that LangGraph
provides. Parallel step groups are declared in config but not yet implemented;
LangGraph would have given that free. If the pipeline ever grows genuine
branching — conditional paths, dynamic fan-out, sub-graphs per step — this
decision should be revisited rather than defended.

**Honest.** `deepagents` pulls LangGraph in transitively. Anyone with a hard
constraint against it in the dependency tree needs to replace the step 12 agent
loop; the fallback path in `_run_agent()` already runs without `deepagents`
installed, so that is a supported configuration rather than a rewrite.
