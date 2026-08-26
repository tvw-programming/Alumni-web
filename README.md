# CodeGen — AI Workflow Monorepo

Unified AI platform with a 24-step development workflow, multiple frontends
(React, Angular, React Native, Kotlin), and code explainers (Python, Java, Go,
Express, .NET).

## Quick Start

```bash
bash scripts/install.sh
npm run dev:core
```

Then open the dashboard at http://localhost:5173 and press **Start a run**.

## Structure

- **core/**: the 24-step AI workflow
  - `core/backend/` — Python pipeline runner, two mandatory human gates, gate API and CLI
  - `core/frontend/` — React 19 + MUI run monitor dashboard
- **apps/**: frontend applications (React, Angular, React Native, Kotlin)
- **libraries/**: reusable component libraries
- **services/**: backend code explainers
- **packages/**: shared utilities, types, design tokens

## Services

- Core API (backend): http://localhost:8000
- Core dashboard (frontend): http://localhost:5173
- React Web: http://localhost:3000
- Angular Web: http://localhost:4200

## The core workflow

`core/` runs a story from a Jira ticket to a reviewed pull request in 24 steps,
stopping twice for a person: once to approve the business requirements document
(step 06) and once to approve the merge (step 24). Steps are configuration, not
code paths — `core/backend/config/config.json` names the model, prompt, budget
and retry policy for each one.

Nothing starts on its own. A run begins when someone presses **Start a run** in
the dashboard or runs `npm run cli:core -- run <JIRA-ID>`.

Out of the box every model is a deterministic mock, so the whole pipeline runs
offline with no API keys and no cost. Switch profiles in `core/.env` to use
Ollama on your machine or the Anthropic/OpenAI APIs.

Useful commands:

```bash
npm run dev:core                        # backend :8000 + dashboard :5173
npm run test:core                       # the backend test suite
npm run cli:core -- config validate     # check the config invariants
npm run cli:core -- steps list          # the 24 steps
npm run docker:up                       # the whole stack in Docker
```

`core/README.md` covers the workflow in depth; `core/backend/docs/` holds the
architecture, safety model and step reference.

## Project Map

See `.ai-context.json` for project organization and which files to pass to Claude.

## Installation

1. Clone the repository
2. Run: `bash scripts/install.sh`
3. Start development: `npm run dev:core`

## Docker Setup

```bash
npm run docker:up
npm run docker:down
```

The root `docker-compose.yml` includes `core/docker-compose.yml`, so this brings
up the core backend and dashboard together. `cd core && make up` does the same
thing with health checks and opens the browser.

## For AI Integration

When working with Claude or other AI tools:
1. Reference `.ai-context.json` to know which files are relevant
2. Pass only the specific folder/file path you're working on
3. Example: "Working on: /core/backend"

This minimizes token usage and keeps context focused.
