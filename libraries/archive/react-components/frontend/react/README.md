# Idol-Promo

Production-oriented starter: React 19, strict TypeScript, Material UI, AG Grid Community, TanStack Form, TanStack Query, Axios, React Router v7, Highcharts.

## Quick start

```bash
npm install
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run build
```

Demo login: **admin / admin** (dashboard and admin routes are protected).
Data comes from https://dummyjson.com (writes are simulated by the API).

## Architecture

| Layer          | Location                                                   | Notes                                                             |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Axios client   | `src/api/axiosClient.ts`                                   | Factory + interceptors: auth token injection, error normalization |
| Typed requests | `src/api/request.ts`                                       | `get/post/put/del` — the only way features touch HTTP             |
| Query keys     | `src/api/queryKeys.ts`                                     | Hierarchical, filters embedded in keys                            |
| Query client   | `src/api/queryClient.ts`                                   | staleTime/gcTime defaults, smart retry, global error toasts       |
| Errors         | `src/types/api.ts`, `src/utils/errors.ts`                  | `AppError` discriminated union + `normalizeError`                 |
| Snackbar       | `src/components/snackbar/`                                 | Bus (programmatic) + provider (render queue)                      |
| Generic card   | `src/components/GenericCard/`                              | Typed slots, UI states, surfaces, and optional window controls    |
| Generic popup  | `src/components/GenericPopup/`                             | Controlled Dialog/Drawer slots, actions, and close policies       |
| Grid           | `src/components/grid/AppDataGrid.tsx`                      | Typed AG Grid Community wrapper                                   |
| Routing        | `src/routes/router.tsx`                                    | Lazy route modules, `errorElement`, `ProtectedRoute`              |
| Auth           | `src/store/authContext.tsx`, `src/services/authService.ts` | Session persisted to sessionStorage                               |

## Pages

- `/users` — TanStack Query + Axios (search re-orchestrates the request via the query key)
- `/profile` — TanStack Form + zod (field-level and submit-level errors)
- `/products` — AppDataGrid: quick filter, pagination, multi-select, custom cell renderer, pinned column
- `/dashboard` — protected; Highcharts fed by live query data
- `/admin` — admin role only; sidebar layout with Outlet; 30% form / 70% configurable grid
- `/demo/snackbar` — all snackbar variants and options
- `/admin/master-data/generic-card` — reusable card variants and interaction states
- `/admin/master-data/generic-popup` — controlled popup, form, drawer, and async examples

Note: row grouping is an AG Grid **Enterprise** feature and is intentionally not included.
