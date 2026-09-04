# Project Structure Guide

## Canonical root: `core/`

All 24-step pipeline logic, tests, configuration, and safety contracts live under
`core/`. See `.workspace-root` and `core/README.md`.

### Core Backend
- **Location**: `core/backend/`
- **Type**: Python 3.11+ (FastAPI + Pydantic)
- **Purpose**: pipeline runner, two mandatory human gates, gate API, CLI
- **Port**: 8000
- **Key Files**:
  - `src/codegen_core/orchestrator/runner.py`
  - `src/codegen_core/steps/`
  - `src/codegen_core/core/config.py`
  - `src/codegen_core/dashboard/api.py`
  - `src/codegen_core/tools/file_write_guard.py`
  - `config/config.json`
  - `sample-project/` — **primary pipeline edit target**
  - `stories/`
- **Ignore**: `__pycache__`, `.venv`, `workspace/`

### Core Frontend
- **Location**: `core/frontend/`
- **Type**: React 19 + MUI + Vite
- **Purpose**: run monitor dashboard
- **Port**: 5173

## Optional app

### React Web
- **Location**: `apps/react-web/`
- **Purpose**: Alumni sample UI (optional; not required to run Core)
- **Note**: resolves UI source from `libraries/archive/react-components/`

## Reserved (empty)

| Path | Status |
|------|--------|
| `apps/angular-web/` | Reserved — README only |
| `apps/kotlin-mobile/` | Reserved — README only |
| `apps/react-native/` | Reserved — README only |
| `packages/*` | Reserved — empty package slots |
| `services/*-explainer/` | Reserved — empty explainer slots |

## Archive

- **Location**: `libraries/archive/`
- **Contents**: `react-components/` (~405 MB), `myapp4-2/` (~14 MB), empty Angular/shared stubs
- **Purpose**: quarantine only — not build targets

## AI context tips

1. Prefer `Working on: /core/backend` or `/core/frontend`
2. Do not treat archived libraries as product surface
3. See `.ai-context.json` for key files
