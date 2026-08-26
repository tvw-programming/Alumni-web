---
description: Add a new workflow step with its config entry, prompt and test
argument-hint: <NN> <snake_case_name> <agent|tool|plugin|gate>
---

Add step $1 named `$2` of kind `$3`.

Do all of the following, in this order:

1. Create `src/codegen_core/steps/<phase>/$1_$2.py`, where `<phase>` is the one
   the step number falls in: `requirements` (01-05), `design` (07-11), `build`
   (12-15), `validate` (16-19), `publish` (20-23), `gates` (06, 24). Discovery is
   recursive and ordering comes from the numeric prefix, so the directory is
   presentation only — but keep it honest with `PHASES` in
   `dashboard/presenter.py`, which is what the UI's phase stepper reads.
   - Start with a module docstring in the house style: one line naming the step,
     then `Component:` and `Category:`, then a paragraph explaining *why* this
     step is that component kind rather than another. Read
     `steps/design/09_impact_analysis.py` for the tone — explain the reasoning,
     not the mechanics.
   - For an agent, subclass `JsonAgentStep` from `._base` and set `emits`,
     `slug`, `consumes`, `capability`. For anything else subclass `Tool`,
     `Plugin` or `Gate` from `core.component` and implement `handle`.
   - Export `STEP = YourClass()` at the bottom. Write `step = $1` as a plain
     integer — a leading zero is a Python syntax error.

2. Add a schema to `src/codegen_core/schemas/` if the step emits new structured data,
   and register it in `schemas/__init__.REGISTRY`.

3. Add a stub for it in `llm/backends/mock.py::STUBS` keyed by the schema id, or
   the offline run will fail.

4. Add the config entry under `config.steps["$1"]` with `enabled`, `component`,
   `timeout_s`, `retry`, and `prompt` if it is an agent. Add a routing entry
   under `config.routing.steps["$1"]` naming its capability.

5. Write the prompt at `config/prompts/$1_<slug>.system.md` if it is an agent.
   Prompts state constraints and reasoning, not just format.

6. Add `tests/test_$1_$2.py` covering the step's *specific* contract — not that
   it runs, but that it refuses what it should refuse.

7. Verify: `codegen-core config validate && pytest -q && CODEGEN_PROFILE=local
   CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042`.

Do not renumber existing steps. If $1 collides, stop and ask.
