# Deepage stack → CodeGen `core/`

The 24-stage AI development workflow (formerly "deepage-stack") now lives in
`core/` as two first-class monorepo projects. Everything was rebranded from
`deepage` to `codegen_core`; the `deepagents` PyPI dependency is untouched.

## Layout

```
core/
├── docker-compose.yml            services: backend, frontend
├── Makefile                      make up / down / logs / test / gates / cli
├── run.sh                        preflight + build + health-wait + open browser
├── .env.example                  ports, profile, story, platform
├── docker/
│   ├── backend.Dockerfile        was orchestrator.Dockerfile
│   ├── frontend.Dockerfile       was ui.Dockerfile
│   ├── entrypoint.sh             validate → seed → serve
│   ├── gate_watcher.py           resumes a run when a gate decision arrives
│   └── nginx.conf                prod target only
├── backend/                      was orchestrator/
│   ├── src/codegen_core/         was src/deepage/
│   ├── config/config.json        models, prompts, budgets, gates, remediation
│   ├── tests/                    149 tests
│   ├── stories/DEEP-2041.md      the predefined story
│   ├── sample-project/           was the repo-root workspace/ — the FastAPI
│   │                             service the pipeline implements against
│   ├── artifacts/, runs/         39 sample runs, tracked so the dashboard has
│   │                             something to render before you start a run
│   ├── workspace/                per-job scratch checkouts (gitignored)
│   └── docs/                     architecture, safety model, step reference
└── frontend/                     was ui/
    └── src/                      pages, components, api client, rendered docs
```

## Rebrand map

| Before | After |
|---|---|
| Python package `deepage` | `codegen_core` |
| CLI `deepage` / `deepage-monitor` | `codegen-core` / `codegen-core-monitor` |
| Distribution name `deepage` | `codegen-core` |
| `DeepAgeError` | `CodeGenCoreError` |
| `DEEPAGE_*` env vars | `CODEGEN_*` |
| `DEEPAGE_UI_PORT` / `DEEPAGE_UI_TARGET` | `CODEGEN_FRONTEND_PORT` / `CODEGEN_FRONTEND_TARGET` |
| compose services `orchestrator` / `ui` | `backend` / `frontend` |
| images `deepage/orchestrator`, `deepage/ui` | `codegen/core-backend`, `codegen/core-frontend` |
| volume `deepage-data` | `codegen-core-data` |
| npm package `deepage-ui` | `@codegen/core-frontend` |
| product name "DeepAge" | "CodeGen Core" |

`deepagents` (the PyPI package in the `llm` extra) was deliberately left alone.

## Monorepo wiring

Root `package.json` scripts:

```
npm run dev:core            backend :8000 + dashboard :5173
npm run dev:core-backend    uvicorn --factory codegen_core.dashboard.api:create_app
npm run dev:core-frontend   vite
npm run test:core           the backend pytest suite
npm run lint:core           ruff
npm run typecheck:core      tsc -b
npm run cli:core -- <args>  the codegen-core CLI
npm run docker:up / :down   root docker-compose.yml, which `include`s core/docker-compose.yml
```

`core/frontend` is intentionally **not** an npm workspace member: the frontend
Dockerfile installs from `core/frontend/package-lock.json` inside the container,
which requires a per-project lockfile rather than a hoisted root one.

`scripts/install.sh` was written (it was referenced by the README but did not
exist): npm workspaces → `core/backend/.venv` with `pip install -e ".[dashboard,dev,documents]"`
→ sample-project dev deps → `core/frontend` npm ci → seed `.env` files.

Also updated: `monorepo.json`, `.ai-context.json`, `README.md`,
`docs/PROJECT_MAP.md`, `docs/GETTING_STARTED.md`.

## Verification

Run against the ported tree, compared to the same commands on the original:

| Check | Result |
|---|---|
| `compileall src tests` | clean |
| `pytest tests -q` | 141 passed, 8 failed — **byte-identical to the original** |
| `ruff check src tests` | 147 errors — **byte-identical to the original** |
| `codegen-core config validate` | `OK profile=local backends=13 steps=24 gates=['06','24']` |
| `codegen-core steps list` | all 24 steps, both gates |
| `tsc -b` + `vite build` | clean, 1865 modules |
| `npm run smoke` | all checks passed |
| Live backend + dashboard | dashboard renders the 39 ported runs; docs tab renders |

The 8 pre-existing test failures are environmental, not caused by the port —
the same 8 fail on the untouched original. Two causes: step 14
(static quality validation) exhausts its loop budget because the container has
no ruff/mypy on the sample project's path, and
`test_an_unwritable_project_is_refused` cannot fail a chmod check while running
as root.
