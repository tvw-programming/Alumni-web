# CodeGen — AI Workflow Monorepo

**CodeGen Core** turns a Jira story into a reviewed change set in 24 steps, with
two mandatory human gates (BRD approval and merge). The engine and its dashboard
live entirely under `core/`.

## Quick Start

```bash
bash scripts/install.sh
npm run dev:core
```

Open the dashboard at http://localhost:5173 and press **Start a run**.

## Actual stack (what exists)

| Path | Role |
|------|------|
| `core/backend/` | Python 3.11+ pipeline (`codegen_core`): orchestrator, GuardedFS, gates, FastAPI dashboard API, CLI |
| `core/frontend/` | React 19 + MUI + Vite run monitor |
| `core/backend/sample-project/` | **Primary pipeline target** — FastAPI sample service the agent edits |
| `apps/react-web/` | Optional sample Alumni UI (consumes archived component lib; not required for Core) |

## What is NOT in this repo

These names appear in older docs or empty folders. They are **not** shipped products:

- Angular web, React Native, Kotlin mobile apps (empty reserved dirs under `apps/`)
- Explainer services (`python-explainer`, `express-explainer`, `springboot-explainer`, etc.) — empty
- Hollow `packages/shared-types`, `packages/design-tokens`, `packages/shared-utils`
- Large UI showcases formerly under `libraries/` — quarantined to `libraries/archive/`

Do not expect Nx/Turborepo to build those stubs.

## Storage budget

`apps/`, `libraries/`, `services/`, and `packages/` are **workspace reserved capacity**.
The 24-step engine, tests, config, and safety contracts live only under **`core/`**.
Archived trees under `libraries/archive/` (~420 MB) are kept for history, not for CI.

See `.workspace-root` and `core/README.md`.

## Structure

```
core/                 ← canonical product (pipeline + dashboard + sample-project)
apps/                 ← reserved; only react-web has real code
libraries/archive/    ← quarantined showcases / empty stubs
services/             ← reserved empty explainer slots
packages/             ← reserved empty shared-package slots
```

## Services (running)

- Core API: http://localhost:8000
- Core dashboard: http://localhost:5173

Optional: `npm run dev:react` for `apps/react-web` on :3000 (independent of the pipeline).

## The core workflow

`core/` runs a story from a Jira ticket to a reviewed pull request in 24 steps,
stopping twice for a person: BRD gate (06) and merge gate (24). Models, prompts,
budgets and remediation edges are declared in `core/backend/config/config.json`.

```bash
npm run dev:core                        # backend :8000 + dashboard :5173
npm run test:core                       # backend pytest suite
npm run cli:core -- config validate
npm run cli:core -- steps list
npm run docker:up                       # core stack via Docker
```

`core/README.md` is the deep guide; `core/backend/docs/` covers architecture and safety.

## Installation

1. Clone the repository
2. `bash scripts/install.sh`
3. `npm run dev:core`

## Docker

```bash
npm run docker:up
npm run docker:down
```

Or `cd core && make up` (health checks + browser).

## For AI tools

1. Prefer `.ai-context.json` and **`core/`** as the working set
2. Pass only the folder you are changing (e.g. `core/backend`)
3. Treat `libraries/archive/` as read-only historical material
