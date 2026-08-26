# Angular specification documents

Specifications for the Angular app, written so an LLM can generate correct code
against this codebase without reading every file.

## Why this folder structure

Grouped **by layer, then by concern**, mirroring
`frontend/react/specDoc/` so the two can be read side by side. Where the two apps
differ, the spec says so explicitly rather than describing an idealised shared
design.

```
specDoc/
├── core/        HTTP, errors, the query cache, monitoring — no UI
├── auth/        session, store, guards
├── forms/       the schema-driven engine over Reactive Forms
├── grid/        AG Grid v36 wrapper + config-driven inline editing
├── components/  card, popup, chart shells
├── speech/      Web Speech service
└── documentation/  the in-app specification browser (this folder, rendered)
```

## The one rule this app is built on

**No `BehaviorSubject`, no `async` pipe, no manual `subscribe()` in feature
code.** RxJS appears only where an Angular API returns it, and is converted at
that boundary with `toSignal()` or consumed once with `firstValueFrom`.

There are exactly **three files** with a `.subscribe(`, all in `shared/`:
`generic-popup.ts` (×2 — CDK keydown/backdrop), `snackbar.service.ts`
(`onAction`). Verify with:

```bash
grep -rn "\.subscribe(" src/app --include='*.ts' | grep -v spec
```

`@angular-eslint/prefer-signals` enforces the signal-only input/output model, so
this is machine-checked rather than a convention in a document.

## Reading order for a new feature page

1. [`core/data-layer.md`](core/data-layer.md) — `httpResource`, `resource`, the
   query cache, and **when each one is wrong**
2. [`core/errors.md`](core/errors.md) — `AppError`
3. [`forms/schema-form.md`](forms/schema-form.md) — if the page has a form
4. [`grid/app-data-grid.md`](grid/app-data-grid.md) — if it has a table
5. [`auth/guards.md`](auth/guards.md) — if it is gated

## Conventions that hold everywhere

| Rule | Why |
| --- | --- |
| Every component is `standalone` + `ChangeDetectionStrategy.OnPush` | zoneless + signals; cheap and documents intent |
| Inputs are `input()` / `input.required()`; outputs are `output()` | enforced by lint |
| Page-scoped services are **component-provided**, not `providedIn: 'root'` | a root `httpResource` outlives its page holding a stale list |
| Slots are `<ng-content select="[thing]">`, not `ReactNode` props | |
| `layout/navigation.ts` is the single source for sidebar, routes and voice commands | a link and its command cannot drift |

> **Editing trap.** A backtick inside an inline `template:` or `styles:` comment
> terminates the TypeScript template literal. This has caused three separate
> build failures — use double quotes in those comments.

## Stack

Angular 22 (zoneless) · Angular Material 22 · AG Grid v36 · Highcharts 13 ·
Zod 4 · Vitest · Node ≥ 24.15
