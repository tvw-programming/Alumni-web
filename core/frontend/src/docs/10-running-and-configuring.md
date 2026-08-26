# Running & Configuring

A practical walkthrough: how to point CodeGen Core at Jira (or not), which config
key controls which model, where the corresponding code lives, how a run
actually starts, and why it can look further along than you expect. Written
for someone who has the stack up and wants to drive it, not just read about
its architecture — for the architecture itself, see `02-architecture.md` and
`06-safety-model.md`.

---

## 1 — The map

| Path | What it is |
|---|---|
| `backend/src/codegen_core/` | The Python backend: the 24-step runner, the dashboard API, the CLI |
| `backend/config/config.json` | The single source of truth for routing, plugins, gates, policy |
| `backend/config/prompts/*.md` | The system prompt each agent step sends |
| `stories/*.md` | Local story fixtures the file tracker reads from |
| `frontend/src/` | The React dashboard |
| `runs/<job_id>/` | One run's journal, gate tickets, `story_input.json` — gitignored |
| `artifacts/<job_id>/` | One run's output files, plus `_ledger/` (the idempotency cache) |
| `workspace/` | The checkout the pipeline actually edits from step 12 onward |

`config.json` is read once at boot by `ConfigLoader.load()`
(`core/config.py`) — profile overlay merged in, `${env:VAR}` interpolated,
invariants asserted. Nothing else in the system reads it directly; every
component gets its settings through the typed `AppConfig` object that
produces.

---

## 2 — Configuring Jira / story integration

**The one thing to internalise first: `config.json` never holds requirement
text.** It only ever holds a *pointer* — either to a live Jira API, or to a
folder of `.md` files. Search the whole repo for a literal BRD or acceptance
criterion embedded in JSON and you won't find one; it isn't how this is built.

The pointer lives at `plugins.tracker`:

```json
"plugins": {
  "tracker": {
    "driver": "jira",
    "base_url": "${env:JIRA_URL:-}",
    "auth": { "type": "api_token", "user_env": "JIRA_USER", "token_env": "JIRA_TOKEN" },
    "project_key": "DEEP"
  }
}
```

- **`driver: "jira"`** — calls the real Jira REST API at `base_url`, authenticated
  from the env vars named in `auth` (not their values — `JIRA_URL`, `JIRA_USER`,
  `JIRA_TOKEN` live in `backend/.env`, read via `${env:...}` interpolation
  in `core/config.py`). If `base_url` is empty, or `dry_run: true` is set, it
  falls back to a fixture story baked into `plugins/tracker_jira.py` — not from
  config, from Python.
- **`driver: "file"`** — reads `<stories_dir>/<KEY>.md` instead: YAML-ish front
  matter (`key`, `title`, `priority`, `labels`) plus `## Description` and
  `## Acceptance Criteria` markdown sections, parsed by `plugins/tracker_file.py`.
  `stories_dir` is the only thing config supplies — the requirement text lives
  in the file, not the JSON.

Which driver is active depends on the profile:

| Profile | `plugins.tracker` override | Effective behaviour |
|---|---|---|
| base / `local` (default) | `driver: "jira"`, `local` adds `dry_run: true` | Fixture story, no network |
| `docker`, `docker-ollama`, `docker-cloud` | `driver: "file"`, `stories_dir: "/stories"` | Reads `stories/<KEY>.md` |

Today `stories/` has exactly one file, `DEEP-2041.md` — the file driver can
only resolve that key until you add more.

**To point at a real Jira instance**: set `JIRA_URL`/`JIRA_USER`/`JIRA_TOKEN`
in `backend/.env`, and either switch the active profile away from `local`,
or set `plugins.tracker.dry_run` to `false` explicitly in whichever profile
you're running.

**To add a local fixture story**: drop `stories/<YOUR-KEY>.md` in the same
shape as `DEEP-2041.md`, run under a `docker*` profile (or override
`plugins.tracker.driver` to `"file"` yourself).

The third source — the one actually used most of the time — is per-run, not
config at all: see §5.

---

## 3 — Configuring the AI models

Every agent step names a **capability**, not a model. `routing.defaults` maps
each capability to a backend id; `routing.steps."NN"` says which capability
step `NN` needs, with an optional per-step override.

```json
"routing": {
  "defaults": {
    "fast": "local.ollama.qwen",
    "coding": "paid.anthropic.sonnet",
    "reasoning": "paid.anthropic.opus",
    "security": "cloud.bedrock.sonnet",
    "vision": "paid.openai.gpt"
  },
  "steps": { "12": { "capability": "coding" }, "23": { "capability": "reasoning" }, ... }
}
```

### Reasoning — "thinking" model

`routing.defaults.reasoning` (base: `paid.anthropic.opus`), fallback chain at
`routing.fallback_chains.reasoning`.

| Step | What it does |
|---|---|
| 02 | Story detailed analysis |
| 03 | Gap / ambiguity detection |
| 04 | Project context specification |
| **05** | **BRD generation** — see "document generation" below |
| 07 | Test case design (pre-implementation) |
| 10 | Feature specification |
| 13 | Code-to-requirement verification |
| **20** | **Technical design document** — see "document generation" below |
| 23 | AI pull request review |

### Coding — "code update" model

`routing.defaults.coding` (base: `paid.anthropic.sonnet`).

| Step | What it does |
|---|---|
| 08 | Repository understanding |
| 09 | Impact analysis (writes the write-scope whitelist) |
| 11 | Implementation plan |
| **12** | **Code update — the step that actually writes to `workspace/`** |
| 15 | Unit test synchronization |
| 21 | Documentation update |

To route step 12 to a different backend without touching its capability:

```json
"routing": { "steps": { "12": { "capability": "coding", "backend": "devtool.cursor" } } }
```

— exactly what `profiles.devtool` does. One constraint enforced at boot
(`core/config.py::assert_invariants`, invariant 3): whatever backend steps
12/15 resolve to, steps 13/23 (the reviewers) must resolve to a **different**
one — the "no self review" isolation rule. A config that can't satisfy this
refuses to start.

### Document generation

There's no separate `routing.defaults.document` — the BRD (step 5) and the
TDD (step 20) are just `reasoning`-capability agents whose output also
triggers document rendering:

```json
"05": { "prompt": "05_brd.system.md", "render_documents": ["pdf"] }
```

`render_documents` is the actual "produce a file" switch — it's what turns the
JSON payload into a rendered `.pdf` (or `.docx`, if you add it to the array;
the extension rules already allow it). Model quality is still controlled the
same way as any other reasoning step: `routing.defaults.reasoning` or a
per-step override on `"05"`/`"20"`.

### Test design, sync, and execution

Three different surfaces, and only two of them are LLM calls:

| Step | Kind | Config surface |
|---|---|---|
| 07 | agent, `reasoning` | `routing.steps."07"` |
| 15 | agent, `coding` | `routing.steps."15"` |
| **16** | **plugin — no LLM at all** | `plugins.test_runner.driver` |

```json
"plugins": { "test_runner": { "driver": "pytest", "command": ["pytest", "-q", "--json-report", "--cov"] } }
```

There is deliberately **no `routing.steps."16"` entry** — step 16 runs pytest
and reports pass/fail plus coverage; nothing about it involves a model, a
prompt, or a token cost. Coverage thresholds come from
`policy.quality_thresholds.min_line_coverage_pct` /
`.min_changed_line_coverage_pct`, not from routing.

### A gotcha: two vestigial routing entries

`routing.steps` also lists `"01"` (`capability: "fast"`) and `"24"`
(`capability: "fast"`) — but step 01 (`JiraStoryExtraction`, a plugin) and
step 24 (the merge gate) never call `ctx.router` at all. Neither reads or
needs its entry; if you're hunting for what backend "runs step 01," the
answer is: nothing does, it's a deterministic file/API read. Don't spend time
tuning these two.

### Backends and the `local` profile

Every `backends.*` entry declares a `driver` (the protocol — never a vendor
name, per the project's own rule) and which `capabilities` it can serve:

| Backend id | driver | model | enabled |
|---|---|---|---|
| `local.ollama.qwen` | ollama | qwen3:8b | yes |
| `local.ollama.deepseek` | ollama | deepseek-coder-v2:16b | yes |
| `cloud.bedrock.sonnet` | bedrock | claude-sonnet-4 | yes |
| `cloud.together.llama` | openai_compatible | Llama-3.3-70B | yes |
| `paid.anthropic.sonnet` | anthropic | claude-sonnet-4-6 | yes |
| `paid.anthropic.opus` | anthropic | claude-opus-4-1 | yes |
| `paid.openai.gpt` | openai | gpt-4.1 | yes |
| `mock.offline` / `mock.reviewer` | mock | mock-1 / mock-reviewer-1 | yes |
| `devtool.cursor` / `.copilot` / `.claude_code` | cli_agent | — | **no**, per-profile only |

`profiles.local.routing.defaults` (the profile active unless you set
`CODEGEN_PROFILE`) points **every** capability at `mock.offline`. That backend
does no network call at all — it pattern-matches the schema name in the
prompt and returns deterministic, schema-valid canned JSON. `mock.reviewer`
exists as a second distinct backend purely so the self-review isolation rule
above is still satisfiable when everything else is mocked. This is what makes
`CODEGEN_PROFILE=local codegen-core run ...` free and instant — see §5.

---

## 4 — Where to make a code change

| You want to change... | Edit |
|---|---|
| One step's prompt / instructions | `config/prompts/NN_*.md` |
| One step's logic (post-processing, status rules) | `src/codegen_core/steps/NN_name.py` |
| Which model a step uses | `config.json` → `routing.steps."NN"`, no code |
| A new LLM vendor with an existing protocol | `config.json` → `backends.*`, no code (rule: driver, not vendor) |
| A new vendor **protocol** | a class in `llm/backends/`, registered in `llm/factory.py` |
| A plugin's external tool (tracker, test runner, VCS, scanners) | `config.json` → `plugins.*`, or a new class in `plugins/` registered in `plugins/factory.py` |
| The dashboard's gate/decision surface | `src/codegen_core/dashboard/api.py` + `presenter.py` |
| A dashboard control (button, dialog) | `frontend/src/components/dashboard/` or `frontend/src/components/step/` |
| The offline demo data | `frontend/src/data/run.ts`, `frontend/src/api/mockApi.ts` |

---

## 5 — Runtime workflow

### Nothing starts on its own

There is no schedule, no webhook, and — as of this doc — no boot-time seed
either. `docker compose up` / `make up` brings the stack up empty; the two
entry points are the dashboard's **Start a run** button and
`codegen-core run <JIRA-ID>` / `make run-story STORY=<JIRA-ID>` from a terminal.
(`CODEGEN_SEED_RUN=1` in `.env` brings back the old auto-seed-to-step-5 demo
if you want it for a quick look.)

### The Start-a-run popup, and what "declining" it does

The dialog asks for the story number, title, description, and acceptance
criteria. Two ways to skip typing all of it, both landing on the same
outcome — a run starts, using the tracker (§2) for whatever wasn't provided:

- **Toggle "skip the details and fetch from the tracker," then press Start.**
- **Just close the dialog** — Cancel, the X, Escape, the backdrop — once a
  story number is typed. A story number with nothing else filled in falls
  back to the tracker; a story number with a *complete* form (title +
  criteria) typed in is submitted as you typed it rather than thrown away.
  An **empty** story number is the one case with nothing to start, and stays
  a plain close.

Acceptance criteria are required in the typed-in path — not decorative:
steps 05, 07, 13 and 23 all trace back to criterion ids, so a story without
any is refused before step 01 rather than four steps later.

### Why a run can look further along than you expect

Three real, distinct reasons — worth knowing apart, because they call for
different reactions:

1. **Running the dashboard with no backend configured** (`npm run dev` with
   `VITE_API_BASE` unset in `frontend/.env`) paints a hardcoded demo fixture the
   instant the page loads — 17 of 24 steps already `SUCCESS`/`APPROVED`,
   before any run was started. This is `frontend/src/data/run.ts`'s `buildRun()`,
   shown via the mock transport's `peekRun()`. It's a fixed demo, not a live
   run — point `VITE_API_BASE` at a running orchestrator to see the real
   thing.
2. **The mock LLM backend has no artificial delay.** A genuine
   `CODEGEN_PROFILE=local CODEGEN_AUTO_APPROVE=1 codegen-core run <ID>` really does
   drive all 24 steps and both gates to completion in about two seconds —
   `CODEGEN_AUTO_APPROVE` auto-clears both human gates (`plugins/hitl_dashboard.py`),
   and the mock backend returns instantly. That's real, fast completion, not
   a display bug — drop `CODEGEN_AUTO_APPROVE` to see it stop and wait at
   gate 06 like it will for a real user.
3. **A step that fails still holds a journal record.** "Has a record" is not
   the same as "succeeded" — the dashboard's own step-status logic accounts
   for this (a failed or rejected step reports `FAILED`/`REJECTED`, not
   "done"), but if you're reading the journal directly, don't mistake
   presence-of-a-record for success.

### Data propagation — from the popup to every later step

```
popup / CLI flags
  → runs/<job_id>/story_input.json      (core/story_input.py)
  → step 01 reads it (or falls back to the tracker)
  → JiraStoryV1 { ..., source_checksum }
  → ctx.remember("JiraStoryV1", story)
  → every later step's `consumes` list resolves it from ctx.store
  → 01_jira_story__<job>__v1.json in the artifact index
```

`source_checksum` is what makes an edited ticket propagate correctly: it's
part of what the per-story idempotency ledger (`core/ledger.py`) hashes, so a
changed story invalidates every cached step built on it rather than serving
stale output. See the step 01 section of `05-steps-reference.md` for the full
mechanics, and property 11 in `06-safety-model.md` for why the two human
gates are never served from that cache.

---

## 6 — A worked walkthrough

```bash
make up                                    # empty dashboard, nothing has run
```

1. Open `http://localhost:5173`, press **Start a run**.
2. Type a story number, e.g. `DEEP-3005`, and either fill in the title,
   description and criteria, or toggle "fetch from the tracker."
3. The run begins at step 01. Watch it walk through requirements analysis,
   context, and the BRD — it stops at the **BRD gate** (step 06), amber,
   waiting for you.
4. **Approve** it and the run continues through design, implementation,
   verification, security scans, and documentation, stopping again at the
   **merge gate** (step 24). **Reject** it and the run halts — there's no
   automatic retry of a rejected BRD, because regenerating from the same
   inputs produces the same document. Instead, **Rerun** on the gate opens a
   prompt to upload a replacement BRD, which supersedes the rejected one and
   re-opens the gate against the new document.
5. A step that genuinely fails (not a rejection — an error) blocks the whole
   run behind it. The dashboard offers **Retry** — a different control from
   the gate's Rerun above — which re-runs strictly that step and, once it
   clears, continues automatically.

For the full README walkthrough see the repo root; for the gate mechanics and
every other safety property, see `06-safety-model.md`.
