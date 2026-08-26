# Configuration

One file: `config/config.json`. It is loaded once, validated, and frozen.

## Load pipeline

```
config.json
   │ 1. read raw JSON
   │ 2. select profile: CODEGEN_PROFILE env → default_profile
   │ 3. deep-merge profiles[active] over the base (nested dicts merge, scalars replace)
   │ 4. interpolate ${env:VAR} and ${env:VAR:-default}
   │ 5. validate against AppConfig (pydantic, frozen)
   │ 6. assert_invariants()  ← refuses to boot if a safety property is violated
   ▼
AppConfig
```

Step 6 is the important one. Configuration errors surface at process start with
a specific message, not at step 14 after forty minutes and eight dollars.

## Sections

| Section | Controls |
|---|---|
| `app` | paths, retention, concurrency |
| `a2a` | transport, inline payload limit, adapter table |
| `backends` | every model, all four tiers |
| `routing` | capability→backend, per-step overrides, fallbacks, isolation, budgets |
| `pipeline` | start/stop, parallel groups, **remediation edges** |
| `steps` | per-step enabled, component, prompt file, timeout, retry |
| `artifacts` | naming template, extension rules, checksums |
| `policy` | write scope, LOC caps, coverage floors, forbidden deps |
| `gates` | roles, quorum, escalation, SHA binding |
| `plugins` | which vendor implements each capability |
| `observability` | log level, sinks, metrics, alerts |
| `secrets` | provider, redaction patterns |
| `profiles` | named overlays |

## The three mechanisms

### `driver`, not vendor

Six drivers cover every tier. `openai_compatible` alone absorbs Together, vLLM,
Groq, OpenRouter and internal gateways — they differ only by `base_url`.

```json
"cloud.together.llama": {
  "driver": "openai_compatible",
  "base_url": "https://api.together.xyz/v1",
  "auth": { "type": "bearer", "token_env": "TOGETHER_API_KEY" },
  "capabilities": ["fast", "coding"]
}
```

`cli_agent` does the same for headless binaries:

```json
"devtool.claude_code": {
  "driver": "cli_agent",
  "command": "claude",
  "argv": ["-p", "{prompt}", "--output-format", "json", "--cwd", "{workspace}"],
  "result_json_path": "$.result",
  "edits_files_directly": true
}
```

`{prompt}` and `{workspace}` are substituted at call time. Adding Copilot CLI is
another block, not another module.

### `profiles` — whole combinations behind one env var

```bash
CODEGEN_PROFILE=local      # all mock, plugins dry-run, $0, fully offline
CODEGEN_PROFILE=hybrid     # local extraction, paid coding, Bedrock reasoning
CODEGEN_PROFILE=devtool    # step 12 handed to Cursor CLI
CODEGEN_PROFILE=production # paid tier, Vault secrets, 95% changed-line coverage
```

Overlays deep-merge, so a profile changing `routing.defaults.coding` leaves
`routing.fallback_chains` intact.

### `${env:VAR:-default}` — secrets by reference

Config stores the *name*. A boot-time scanner rejects anything matching `sk-…`,
`ghp_…`, `AKIA…` or a literal bearer token, so a pasted key fails the build
rather than reaching git.

## Invariants

| # | Rule | Why |
|---|---|---|
| 1 | Every routed capability resolves to an enabled backend | Typo'd backend id would fail mid-run |
| 2 | Each step's backend declares the capability it is routed for | Prevents routing coding work to a fast-only model |
| 3 | Isolation rules are satisfiable | One backend means the reviewer *is* the author |
| 4 | **Steps 06 and 24 exist, are enabled, and are gates** | The two human controls |
| 5 | Remediation edges point at real steps with `max_loops ≥ 1` | Prevents infinite cycles |
| 6 | No literal secrets | Config is committed |

Invariant 4 also rejects `gates.NN.can_disable: true`, and is checked *after* the
profile overlay — so a profile cannot sneak past it.

## Remediation edges

The most valuable thing that moved into config. Pipeline topology is now data:

```json
{ "from": 16, "on": "FAILED", "to": 12, "max_loops": 4 }
```

Nine edges cover every failure path. Because each carries `max_loops`, an
infinite remediation cycle is not something you can write by accident — the
runner escalates to the notifier and halts.

## Inspecting it

```bash
codegen-core config validate                    # schema + invariants
codegen-core config explain --step 12           # resolved backend, model, params, cost
codegen-core config health                      # every enabled backend
codegen-core config diff --other production     # what an overlay changes
```
