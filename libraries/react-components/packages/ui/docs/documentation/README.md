# Documentation

Evidence-based feature documentation for this repository. Every implementation
claim links to a file, and most to a line. Nothing here was written from memory
of how the code "should" work.

## How to read these documents

Each document labels its claims so you can tell fact from opinion:

| Label                   | Meaning                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| **Implemented**         | Confirmed in the current code, with a file reference.                |
| **Inferred**            | A reading of intent that the code supports but does not state.       |
| **Recommended**         | Not implemented. A suggestion, clearly marked as such.               |
| **Limitation**          | A real constraint or trade-off, stated plainly rather than softened. |
| **Needs product input** | Cannot be answered from code. Left blank on purpose.                 |

If a claim carries no label, it is **Implemented**.

## Index

| Document                                                                     | Covers                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [features/generic-chart.md](features/generic-chart.md)                       | Library-agnostic chart shell, Highcharts adapter, drill-down |
| [features/forms.md](features/forms.md)                                       | Schema-driven form engine, field registry, validation        |
| [features/api-calls.md](features/api-calls.md)                               | Transport, hooks, caching, cancellation, 13 request patterns |
| [features/table-variants.md](features/table-variants.md)                     | AG Grid wrapper and the three grid variants                  |
| [features/generic-card-popup.md](features/generic-card-popup.md)             | Reusable card and dialog/drawer shells                       |
| [features/error-monitoring-console.md](features/error-monitoring-console.md) | Three-channel error log, monitoring sink, admin console      |
| [features/speech-navigation.md](features/speech-navigation.md)               | Voice command layer and navigation                           |
| [evidence-inventory.md](evidence-inventory.md)                               | The audit these documents were written from                  |
| [ui-routing-requirements.md](ui-routing-requirements.md)                     | Pre-existing routing requirements (moved here)               |

## Audience

**Decided:** the `Manage*` pages under `/admin/master-data` are an **internal
component showcase**, not end-user product features. The audience for these
documents is therefore **developers working on this codebase** — people who need
to reuse a component, extend it, or understand why it is shaped the way it is.

Where a component has a genuine end-user surface (the dashboard, the error
console), that is called out in the document.

## Cross-cutting architecture

Stated once here; the feature documents reference it rather than repeating it.

### Layering

```
Route (lazy)  →  Feature page  →  Reusable component
                      ↓
                 Hook (TanStack Query)
                      ↓
                 Service (typed, framework-free)
                      ↓
                 request.ts helpers  →  axiosClient  →  HTTP
                      ↓
                 normalizeError → AppError
```

No component imports Axios. Transport lives behind `src/api/`, and features
consume hooks and services only.

| Layer           | Location                           | Owns                                                            |
| --------------- | ---------------------------------- | --------------------------------------------------------------- |
| Transport       | `frontend/react/src/api/axiosClient.ts`  | Base URL, auth header, refresh-once on 401, error normalisation |
| Telemetry       | `frontend/react/src/api/apiTelemetry.ts` | Correlation IDs, timing, the single API-failure capture point   |
| Request helpers | `frontend/react/src/api/request.ts`      | `get/post/put/patch/del`, `buildListQuery`                      |
| Cache policy    | `frontend/react/src/api/queryClient.ts`  | Retry rules, global error toasts                                |
| Query keys      | `frontend/react/src/api/queryKeys.ts`    | One key hierarchy; keys embed filters                           |
| Services        | `frontend/react/src/services/`           | Endpoint shapes, typed responses                                |
| Hooks           | `frontend/react/src/hooks/`              | Query/mutation wiring, invalidation                             |

### Error handling

Two layers of UI fallback, one normaliser, one log.

- `normalizeError()` turns anything thrown into a typed `AppError`
  (`frontend/react/src/utils/errors.ts:13`).
- `getUserMessage()` is the only place user-facing wording is decided
  (`frontend/react/src/utils/errors.ts:54`).
- `AppErrorBoundary` catches render crashes; `RouteErrorView` catches route and
  loader failures; `globalErrorHandlers` catches everything else.
- Every failure lands in the durable log — see
  [features/error-monitoring-console.md](features/error-monitoring-console.md).

### Authorization

Capabilities, not role checks scattered through components:

```ts
import { usePermission } from '@/auth/usePermission';
const canWipe = usePermission('diagnostics:manage');
```

- Model: `frontend/react/src/auth/permissions.ts`
- Route gate: `frontend/react/src/components/layout/ProtectedRoute.tsx`

**Limitation.** This is a UI guard. It decides what to _render_, and a client can
always be modified. The Go service in `api/` currently has **no authentication
middleware at all** — it exposes `GET /health` and `GET /api/items` only
(`api/cmd/server/main.go:47-48`). Nothing enforces these capabilities on the
server today.

**Limitation.** Sign-in has no backend. With `VITE_AUTH_ENDPOINT` unset, a
development build uses a mock that accepts any credentials, and a **production
build refuses to sign anyone in**. See
[features/api-calls.md](features/api-calls.md#authentication).

### Accessibility baseline

- Skip-to-content link and focus management on route change
  (`frontend/react/src/components/layout/a11y.tsx`).
- Charts are keyboard navigable point-by-point
  ([features/generic-chart.md](features/generic-chart.md#accessibility)).
- Grids expose `grid` / `columnheader` / `gridcell` roles.

### Verification commands

```bash
cd frontend/react
pnpm typecheck     # tsc --noEmit
pnpm lint          # eslint .
pnpm test          # vitest run  (also writes public/test-report.json)
pnpm build         # tsc -b && vite build
pnpm check         # all of the above plus format:check
```

At the time of writing: **274 tests across 28 files**, all passing.
