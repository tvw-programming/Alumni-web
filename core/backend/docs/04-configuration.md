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
| `app` | paths, **project path**, retention, concurrency |
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
| `visualization` | dashboard variants — see [09-visualization-variants](09-visualization-variants.md) |
| `profiles` | named overlays |

## The project path

`app.project` names the checkout the Jira story is implemented against — the
repository steps 04, 08, 12–19 and 21 read and edit.

```json
"app": {
  "project": {
    "path": "/absolute/path/to/the/repo",
    "must_exist": true,
    "must_be_writable": true
  }
}
```

| Key | Default | Meaning |
|---|---|---|
| `path` | `""` | Absolute is recommended. A relative path resolves against the working directory, and `{job_id}` is substituted if present. Empty falls back to `app.paths.workspace`, which is the historical behaviour. |
| `must_exist` | `true` | Fail at boot if the directory is missing. Set false to let the run create it. |
| `must_be_writable` | `true` | Fail at boot if the process cannot write there. |

Validation runs in `AppConfig.validate_project_path()`, called from
`assert_invariants()`, from `JobContext.create()` and from `codegen-core config
validate`, which prints the resolved path. A bad value fails at boot with the
key and the path in the message, rather than at step 12:

```
app.project.path points at '/nope/missing', which does not exist. Create it,
correct the path, or set app.project.must_exist=false to let the run create it.
```

## Where generated files land

Artifacts are written to `<app.paths.artifacts>/<story folder>`, where the story
folder is the Jira id plus the first 15 characters of the story title, sanitised
for every supported OS — `DEEP-2041-implement-user`. Step 01 binds it as soon as
the ticket is in hand, so the JSON, Markdown, PDF and DOCX of one story sit
together. The artifact index records the folder per entry (`dir`), and readers
resolve through `ArtifactStore.local_path()` rather than assuming a layout.

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
| 7 | A gate that accepts a replacement document names the step it replaces, and declares no `REJECTED` edge | Two contradictory answers to one rejection |

Invariant 4 also rejects `gates.NN.can_disable: true`, and is checked *after* the
profile overlay — so a profile cannot sneak past it.

## Remediation edges

The most valuable thing that moved into config. Pipeline topology is now data:

```json
{ "from": 16, "on": "FAILED", "to": 12, "max_loops": 4 }
```

Eight edges cover every failure path. Because each carries `max_loops`, an
infinite remediation cycle is not something you can write by accident — the
runner escalates to the notifier and halts.

Note which edge is *absent*: there is none from step 06. A rejected BRD is not a
failure to retry — the model read the same story, the same analysis and the same
project context, so running step 05 again produces the same document. That gate
declares a `revision` block instead.

## Gate revisions — answering a rejection with a document

```json
"gates": {
  "06": {
    "name": "BRD Approval",
    "required_roles": ["product_owner"],
    "revision": {
      "enabled": true,
      "replaces_step": 5,
      "slug": "brd",
      "variant": "revised",
      "schema_id": "BrdV1",
      "accepted_extensions": ["md", "pdf", "docx"],
      "max_bytes": 10485760,
      "max_revisions": 3
    }
  }
}
```

| Key | Meaning |
|---|---|
| `replaces_step` / `slug` | Which artifact the upload supersedes. A gate writes only its own decision record, so the BRD belongs to step 05 |
| `schema_id` | The contract the document must parse into. A hand-written BRD constrains steps 07, 13 and 23 exactly as a generated one does |
| `variant` | Filename marker: `05_brd__revised__JOB__v1.md` says at a glance that a human wrote it |
| `max_revisions` | Bounded like `max_loops`. A gate cannot be re-litigated forever |

What happens on upload, in order — artifacts first, so a failure anywhere leaves
the gate rejected and the run stopped, which is the safe state:

1. the document is read (`.pdf` and `.docx` need `pymupdf` / `python-docx`;
   `.md` always works) and parsed into `schema_id`, or refused with the reason
2. the new artifacts are written, superseding the step 05 set — nothing is
   overwritten, because the store is immutable and an auditor needs both
3. a `gate_revision` entry lands in the journal with who, what and which
   checksum replaced which
4. the rejection is archived and the gate re-opens, bound to the new checksum

The run does **not** resume on the strength of an upload. It waits for a fresh
decision on the new document, which is the whole point of the gate.

```bash
codegen-core revise DEEP-2041-9b607e 6 ./brd-v2.md --as priya.raman --role product_owner
```

## What is not in config.json

Three things a reader looks for here and will not find, with where they live
instead:

| | |
|---|---|
| **Whether a run starts** | Nowhere. Nothing starts a run but a person — `POST /api/runs` or `codegen-core run`. The container's old boot-time seed is off by default; `CODEGEN_SEED_RUN=1` brings it back for demos. |
| **The story text** | `runs/<job>/story_input.json` when a developer typed it in, or the tracker at `plugins.tracker` when they did not. Not config: a story is per run, and config is per deployment. |
| **What has already been produced** | `artifacts/_ledger/<JIRA>.json`. A step whose inputs hash to what they hashed last time is skipped and its artifacts copied forward. No knobs — the key *is* the policy, and the two gates are never in it. |

## Inspecting it

```bash
codegen-core config validate                    # schema + invariants
codegen-core config explain --step 12           # resolved backend, model, params, cost
codegen-core config health                      # every enabled backend
codegen-core config diff --other production     # what an overlay changes
```
