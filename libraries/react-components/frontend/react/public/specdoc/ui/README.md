# React specification documents

Specifications for the React app, written so an LLM can generate correct code
against this codebase without reading every file.

## Why this folder structure

Grouped **by layer, then by concern** — the axis along which conventions change.
A generator working in `forms/` needs the field-registry contract; one working in
`core/` needs the error contract.

```
specDoc/
├── core/        transport, errors, monitoring — no UI
├── auth/        session, context, route guard
├── forms/       the schema-driven form engine
├── grid/        AG Grid wrapper + config-driven inline editing
├── components/  GenericCard, GenericPopup, GenericChart
├── speech/      voice command layer
└── documentation/  the in-app specification browser (this folder, rendered)
```

## Reading order for a new feature page

1. [`core/http.md`](core/http.md) — how a request is made and what it returns
2. [`core/errors.md`](core/errors.md) — `AppError`, the app-wide failure shape
3. [`forms/schema-form.md`](forms/schema-form.md) — if the page has a form
4. [`grid/app-data-grid.md`](grid/app-data-grid.md) — if the page has a table
5. [`auth/protected-route.md`](auth/protected-route.md) — if it is gated

## Conventions that hold everywhere

| Rule                                                                                      | Why                                                 |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Every failure is normalised to `AppError` before it reaches a component                   | Components never inspect an Axios error             |
| Server state lives in TanStack Query; local state in `useState`                           | One owner per piece of state                        |
| The access token is held **in memory**; the refresh token is an httpOnly cookie           | Anything script can read, injected script can steal |
| A form's schema is data (`FieldConfig[]`), never JSX                                      | Adding a field is one object                        |
| Grid columns are metadata; `buildEditableColDefs` wires the editors                       | No per-grid editor code                             |
| A component that can fail renders loading / empty / error / content, decided in one place | Two states can never show at once                   |

## Stack

React 19 · TypeScript · MUI · TanStack Query + Form · AG Grid v33 · Highcharts ·
Zod · Vite · Vitest
