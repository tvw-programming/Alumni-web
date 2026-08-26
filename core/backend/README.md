# CodeGen Core

A 24-stage AI development workflow: Jira ticket → analysis → BRD → **human
approval** → tests → code → verification → security → PR → **human approval** →
merge.

Python + LangChain + Deep Agents. Config-driven. Two human gates that
configuration cannot disable.

## Quick start

```bash
cd core/backend
pip install -e ".[dev,dashboard]"

codegen-core config validate                                    # check invariants
codegen-core steps list                                         # the 24 steps
CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run DEEP-1042
pytest -q                                                  # 58 tests
```

The `local` profile runs the entire pipeline offline with no API keys and no
cost — every model is mocked, every plugin dry-runs. Use it to explore.

## What comes out

One run produces 31 artifacts under `artifacts/<job-id>/`:

```
01_jira_story__JOB__v1.json       09_impact_manifest__JOB__v1.json
05_brd__JOB__v1.md / .pdf         12_code_changeset__JOB__v1.json
06_brd_approval__JOB__v1.json     12_diff__JOB__v1.diff
07_test_design__JOB__v1.json      20_tdd__JOB__v1.md / .pdf
                                  24_release_notes__JOB__v1.md
```

Naming is `NN_slug[__variant]__JOB__vK.ext`, enforced on write. Extension is
determined by output class: structured → `.json`, documents → `.pdf`/`.docx`,
errors and snapshots → `.jpg`, specifications → `.md`.

Plus `runs/<job-id>/journal.ndjson` — an append-only record of every step,
model, prompt hash, cost and approval.

## The two gates

Steps 06 (BRD approval) and 24 (PR approval) are mandatory. They cannot be
disabled by config, by a profile overlay, or by a flag —
`AppConfig.assert_invariants()` refuses to boot, and eight tests prove it.

Approvals bind to `artifact_sha256`, so regenerating an approved document
invalidates its own approval.

```bash
codegen-core gates list DEEP-1042-53324e
codegen-core approve DEEP-1042-53324e 6 --as priya --role product_owner
codegen-core resume DEEP-1042-53324e
```

## Switching models

Everything is one config file. Four profiles ship:

```bash
CODEGEN_PROFILE=local       # all mock, $0, offline
CODEGEN_PROFILE=hybrid      # local extraction + paid coding + Bedrock reasoning
CODEGEN_PROFILE=devtool     # step 12 handed to a CLI agent
CODEGEN_PROFILE=production  # paid tier, Vault secrets, 95% changed-line coverage
```

Six drivers cover every vendor: `ollama`, `openai_compatible` (Together, vLLM,
Groq, OpenRouter, internal gateways), `bedrock`, `anthropic`, `openai`,
`cli_agent` (Cursor, Copilot, Claude Code). Adding a vendor that speaks an
existing protocol is a JSON block, not a module.

```bash
codegen-core config explain --step 12    # which model, what params, what cost
codegen-core config health               # every enabled backend
```

## Documentation

Start with [docs/01-concepts.md](docs/01-concepts.md) — six ideas that explain
most of the design. Then [docs/README.md](docs/README.md) for the full index:
architecture, the A2A protocol, configuration, all 24 steps, the safety model,
extending, and the Claude Code workflow.

## Layout

```
src/codegen_core/core/          config, envelope, artifacts, journal, policy
src/codegen_core/llm/           6 drivers + capability router with reviewer isolation
src/codegen_core/steps/         NN_name.py — one file per stage, each exports STEP
src/codegen_core/tools/         deterministic helpers (file_write_guard.py is critical)
src/codegen_core/plugins/       Jira, GitHub, pytest, Playwright, Semgrep, Trivy, ZAP
src/codegen_core/schemas/       versioned pydantic contracts
src/codegen/core-backend/  runner, retry, remediation, gates
config/config.json         single source of truth
config/prompts/*.md        16 agent prompts
docs/                      8 documents + 2 ADRs
```

## Requirements

Python 3.11+. Only `pydantic` is required; everything else is an optional extra
(`[anthropic]`, `[openai]`, `[ollama]`, `[bedrock]`, `[dashboard]`, `[dev]`).
The offline profile needs none of them.
