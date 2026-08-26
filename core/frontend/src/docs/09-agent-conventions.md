# CodeGen Core — working notes for Claude Code

A 24-stage AI development workflow with two mandatory human gates. This file is
the contract for anyone (human or agent) changing this repository.

## Run it

```bash
pip install -e ".[dev]"
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042   # offline, $0
pytest -q                                                            # 58 tests
codegen-core config validate                                              # invariants
codegen-core steps list                                                   # the registry
```

The `local` profile routes every capability to the `mock` driver and dry-runs
every plugin, so the full pipeline runs with no keys, no network and no cost.
Use it for anything structural.

## Non-negotiable rules

These are enforced by tests. If a change makes one of them false, the change is
wrong, not the test.

1. **Steps 06 and 24 cannot be disabled.** Not by config, not by a profile
   overlay, not by a flag. `AppConfig.assert_invariants()` rejects it, and
   `tests/test_config_invariants.py` proves it. Never add an escape hatch.
2. **All writes go through `GuardedFS`.** Never call `Path.write_text()` on
   anything inside `workspace/`. The guard is the only boundary between an agent
   and the repository.
3. **The reviewer is never the author.** Steps 13 and 23 must resolve to a
   different model than steps 12 and 15. `LLMRouter` enforces this off the
   journal; do not bypass it.
4. **No vendor names in code.** Code knows *drivers* (protocols). Vendors live in
   `config.json`. Adding Groq means a JSON block, not a module.
5. **No `langgraph` import.** `deepagents` depends on it transitively; we author
   none ourselves. See `docs/adr/0001-no-langgraph.md`.
6. **Never invent a requirement.** Ambiguity halts the pipeline and opens a
   question. This applies to prompts as much as to code.

## Layout

```
src/codegen_core/core/        protocol + kernel (config, envelope, artifacts, policy)
src/codegen_core/llm/         6 drivers + capability router
src/codegen_core/steps/       NN_name.py, one per stage, each exports STEP
src/codegen_core/tools/       deterministic helpers; file_write_guard.py is critical
src/codegen_core/plugins/     external systems, vendor chosen by config
src/codegen_core/schemas/     pydantic contracts, versioned (V1, V2 - never edit V1)
config/config.json       single source of truth
config/prompts/*.md      prompt text (never in JSON)
```

## Conventions

- Step files are `NN_snake_case.py` and export exactly one `STEP`. Python cannot
  import a module starting with a digit, so `steps/_loader.py` loads by path.
  Inside the file write `step = 6`, not `06` — the latter is a syntax error.
- Artifacts: `NN_slug[__variant]__JOB__vK.ext`. Extension is enforced by output
  class: structured `.json`, document `.pdf`/`.docx`, error `.jpg`, spec `.md`.
- Schemas are append-only. Add `V2`, never mutate `V1`.
- Every step declares `consumes`, `produces`, `accepts`, and a `category`.

## Adding things

**A backend** — a block in `config.backends` using an existing `driver`. No code.
**A vendor with a new protocol** — a class in `llm/backends/`, registered in
`llm/factory.DRIVERS`.
**A step** — see `.claude/commands/new-step.md`.
**A plugin vendor** — a class in `plugins/`, registered in `plugins/factory.REGISTRY`.

## When you change something

Run in this order and fix what breaks before moving on:

```bash
codegen-core config validate
pytest -q
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042
```

The third one is the real check: it exercises all 24 steps, both gates, the
artifact rules and the router in about two seconds.

## Known sharp edges

- `cli_agent` backends with `edits_files_directly: true` (Cursor, Claude Code)
  write to disk themselves and **bypass `GuardedFS`**. Step 12 audits the diff
  afterwards via `audit_changeset()`, which is strictly weaker — the unwanted
  edit exists on disk, it just isn't committed. Prefer in-process backends when
  the whitelist genuinely matters.
- `deny_globs` use `fnmatch`, which does not treat `**/` as "any depth including
  none". `PolicyEngine._glob_match` compensates. If you add glob handling
  elsewhere, replicate that or root-level files slip through.
- The mock backend keys off the schema named in the prompt's
  "matching the X schema" instruction. Changing `_base.SCHEMA_INSTRUCTION`
  breaks every offline run.
