# Architecture

## Runtime object graph

```
ConfigLoader.load()
      │  reads config.json, applies profile overlay, interpolates ${env:},
      │  validates, asserts invariants
      ▼
   AppConfig ──────────────────────────────────┐
      │                                        │
      ▼                                        ▼
JobContext.create()                    load_steps(cfg)
  ├── ArtifactStore   (naming, checksums)   registry: {1..24 → Component}
  ├── Journal         (append-only ndjson)
  ├── PolicyEngine    (preconditions, scope)
  ├── PromptLibrary   (config/prompts/*.md)
  └── Telemetry
      │
      ▼
PipelineRunner.prepare()
  ├── build_backends(cfg)  → {id → LLMBackend}   (6 drivers)
  ├── LLMRouter(cfg, backends, journal)          (isolation lives here)
  └── Remediation(cfg, journal, notifier)        (edges from config)
      │
      ▼
PipelineRunner.run(ctx)
      │
      └── for each step:  bus.build_request → step.handle → journal.append
```

## The runner loop

No graph framework at this layer. The loop is about forty lines and does five
things:

1. Skip steps the journal already recorded as complete (this is what makes
   `codegen-core resume` work).
2. Check preconditions — has the BRD gate been approved? Is there an Impact
   Manifest?
3. Build the request envelope, adapting payloads to what the step accepts.
4. Execute, with retry for transient failures but never for policy violations.
5. On failure, consult the remediation edges from config and jump, or halt.

Everything the runner needs to resume is on disk: the journal, the artifacts,
and the gate decision files. A killed process loses only the in-flight step.

## Why no LangGraph

`deepagents` depends on LangGraph internally, and we use `deepagents` for the
agentic loop in step 12. What we do not do is author graph or state-machine code
ourselves.

The reason is legibility. The pipeline's control flow is 24 sequential steps
plus nine declared failure edges. Expressed as a Python loop plus a config table,
you can read the whole thing in one sitting and diff a topology change. Expressed
as a graph, the same logic is spread across node definitions, edge conditions and
a state schema. See `adr/0001-no-langgraph.md`.

## Module boundaries

| Package | Depends on | Never depends on |
|---|---|---|
| `core/` | pydantic only | llm, steps, plugins |
| `llm/` | core | steps, plugins |
| `tools/` | core | steps, llm |
| `plugins/` | core, tools | steps, llm |
| `schemas/` | pydantic only | everything |
| `steps/` | all of the above | other steps |
| `orchestrator/` | all of the above | — |

Steps never import each other. Data moves between them through the context and
the envelope, never by direct call. That is what allows a step to be disabled,
reordered, or moved to another process.

## Execution paths for one step

```
runner._execute(step, ctx)
   │
   ├─ policy.assert_preconditions(n, ctx)      ← gate approved? manifest present?
   ├─ bus.build_request(step, ctx)             ← gathers `consumes`, adapts to `accepts`
   │
   ├─ if GATE:   step.handle(...)              ← never retried; blocks on a human
   └─ else:      retry.call(step.handle, ...)  ← backoff from config.steps.NN.retry
   │
   ├─ journal.append(env_in, env_out)          ← provenance recorded here
   ├─ telemetry.emit(n, env_out)
   └─ policy.assert_budget()                   ← halts if cost cap exceeded
```
