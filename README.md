# AI Workflow Monorepo

Unified AI platform with 24-step workflow, multiple frontends (React, Angular, React Native, Kotlin), and code explainers (Python, Java, Go, Express, .NET).

## Quick Start

```bash
bash scripts/install.sh
npm run dev:all
```

## Structure

- **core/**: 24-step AI workflow (Python + React)
- **apps/**: Frontend applications (React, Angular, React Native, Kotlin)
- **libraries/**: Reusable component libraries
- **services/**: Backend code explainers
- **packages/**: Shared utilities, types, design tokens

## Services

- Core API: http://localhost:8000
- React Web: http://localhost:3000
- Angular Web: http://localhost:4200

## Project Map

See `.ai-context.json` for project organization and which files to pass to Claude.

## Installation

1. Clone the repository
2. Run: `bash scripts/install.sh`
3. Start development: `npm run dev:all`

## Docker Setup

```bash
npm run docker:up
npm run docker:down
```

## For AI Integration

When working with Claude or other AI tools:
1. Reference `.ai-context.json` to know which files are relevant
2. Pass only the specific folder/file path you're working on
3. Example: "Working on: /libraries/react-components"

This minimizes token usage and keeps context focused.
