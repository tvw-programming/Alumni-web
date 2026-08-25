# Getting Started

## Prerequisites

- Node.js 18+
- Python 3.9+
- Docker (optional, for containerized setup)
- Git

## Installation

### Step 1: Clone Repository
```bash
git clone <your-repo-url>
cd CodeGen
```

### Step 2: Install Dependencies
```bash
bash scripts/install.sh
```

This will:
- Install root npm dependencies
- Create Python virtual environment for core/python
- Install Python dependencies from requirements.txt
- Install Python dependencies for explainer services

### Step 3: Verify Installation
```bash
# Check folder structure
tree -L 2

# Verify all config files exist
ls -la | grep -E ".gitignore|monorepo.json|package.json|.ai-context.json"
```

## Starting Development

### Option 1: Start All Services
```bash
npm run dev:all
```

This runs:
- Python core workflow: http://localhost:8000
- React web UI: http://localhost:3000

### Option 2: Start Individual Services
```bash
# Start Python workflow
npm run dev:core

# In another terminal:
npm run dev:react
```

### Option 3: Start with Docker
```bash
npm run docker:up
```

Access services:
- Core API: http://localhost:8000
- React UI: http://localhost:3000
- Angular UI: http://localhost:4200

Stop:
```bash
npm run docker:down
```

## Using with Claude/AI Tools

### When You Need Help:
1. **Specify the project**: "Working on: /libraries/react-components"
2. **Mention the file**: "File: src/components/BaseForm.tsx"
3. **Paste relevant code**: (50-100 lines max)

### Example:
```
Working on: /libraries/react-components
File: src/components/Button.tsx
Task: Add async validation support

[paste code snippet here]
```

This approach:
- Minimizes token usage (80-95% savings)
- Keeps AI context focused
- Speeds up responses
- Reduces costs

### Reference .ai-context.json
For each project, check `.ai-context.json` to see:
- Which files are key files
- Which folders to ignore (node_modules, dist, etc.)
- Expected language and structure

## Project Structure

```
CodeGen/
├── core/              ← 24-step AI workflow
├── apps/              ← React, Angular, React Native, Kotlin
├── libraries/         ← Reusable components
├── services/          ← Code explainers (Python, Java, Go, etc.)
├── packages/          ← Shared utilities, types, tokens
├── docs/              ← Documentation
├── scripts/           ← Build and automation scripts
└── config files       ← .gitignore, package.json, etc.
```

See `docs/PROJECT_MAP.md` for detailed project information.

## Common Commands

```bash
# Install all dependencies
npm run install:all

# Build all projects
npm run build:all

# Run all tests
npm run test:all

# Start development
npm run dev:all

# Docker operations
npm run docker:up
npm run docker:down

# Export context for AI
npm run export:context
```

## Next Steps

1. Review `.ai-context.json` to understand project organization
2. Read `docs/PROJECT_MAP.md` for detailed structure
3. Pick a project and start developing
4. When getting AI help, always reference the specific project path

## Troubleshooting

### Python venv not activating?
```bash
cd core/python
source venv/bin/activate  # Mac/Linux
# or
venv\Scripts\activate  # Windows
```

### Node modules not installing?
```bash
npm install -g pnpm
pnpm install
```

### Port already in use?
Change ports in the respective app configs:
- Python: `core/python/main.py`
- React: `apps/react-web/.env`
- Angular: `apps/angular-web/angular.json`

## Support

See `.ai-context.json` for guidance on which files to share with Claude.
