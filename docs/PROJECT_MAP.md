# Project Structure Guide

## Core Workflow
- **Location**: `core/`
- **Type**: Python + React
- **Purpose**: 24-step AI workflow engine
- **Key Files**:
  - `core/python/agents/` (workflow logic)
  - `core/python/services/` (service modules)
  - `core/react/src/App.tsx` (UI)
  - `core/python/requirements.txt` (dependencies)

## Libraries

### React Components
- **Location**: `libraries/react-components/`
- **Purpose**: Reusable React components (grid, theme, domain components)
- **Key Files**:
  - `src/components/` (component definitions)
  - `src/hooks/` (custom hooks)
  - `src/types/index.ts` (TypeScript definitions)
  - `package.json` (dependencies)

### Angular Components
- **Location**: `libraries/angular-components/`
- **Purpose**: Reusable Angular components
- **Note**: Dockerized

### Shared Components
- **Location**: `libraries/shared-components/`
- **Purpose**: Framework-agnostic components

## Packages (Shared Utilities)

### Shared Types
- **Location**: `packages/shared-types/`
- **Purpose**: Shared TypeScript types across projects

### Shared Utils
- **Location**: `packages/shared-utils/`
- **Purpose**: Shared utility functions

### Design Tokens
- **Location**: `packages/design-tokens/`
- **Purpose**: Colors, spacing, typography definitions

## Services (Code Explainers)

### Python Explainer
- **Location**: `services/python-explainer/`
- **Purpose**: Convert Python code to video
- **Key Files**:
  - `src/main.py` (entry point)
  - `src/video_generator.py` (video generation logic)
  - `requirements.txt` (dependencies)

### Express Explainer
- **Location**: `services/express-explainer/`
- **Purpose**: Convert Express.js code to video

### Springboot Explainer
- **Location**: `services/springboot-explainer/`
- **Purpose**: Convert Springboot code to video

### Go Explainer
- **Location**: `services/go-explainer/`
- **Purpose**: Convert Go code to video

### .NET Explainer
- **Location**: `services/dotnet-explainer/`
- **Purpose**: Convert .NET code to video

## Apps (Frontend Applications)

### React Web
- **Location**: `apps/react-web/`
- **Purpose**: Main React UI for the workflow
- **Port**: 3000

### Angular Web
- **Location**: `apps/angular-web/`
- **Purpose**: Angular UI alternative
- **Port**: 4200

### React Native
- **Location**: `apps/react-native/`
- **Purpose**: Multi-domain React Native app for mobile

### Kotlin Mobile
- **Location**: `apps/kotlin-mobile/`
- **Purpose**: Native Android app with reusable components

## How to Use This Map

When asking Claude for help:
1. Reference the project location (e.g., "Working on: /libraries/react-components")
2. Specify the key files you need help with
3. Let Claude know if you're adding features or fixing bugs
4. This keeps context focused and minimizes token usage
