# API calls

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).

---

## 1. Overview

Every HTTP request in this application goes through one path. No component
imports Axios; no feature invents its own retry rule, error shape, or cache key.
The layering exists so that four things are decided **once**:

| Decided once                                             | Where                          |
| -------------------------------------------------------- | ------------------------------ |
| How a request is sent (base URL, headers, auth, refresh) | `api/axiosClient.ts`           |
| What a failure _is_                                      | `utils/errors.ts` → `AppError` |
| Whether to retry, and whether to toast                   | `api/queryClient.ts`           |
| What a cache entry is called                             | `api/queryKeys.ts`             |

Two Axios instances exist, built by the same factory: `apiClient` (dummyjson,
the demo data source) and `goApiClient` (the Go Fiber service in `api/`).

### Business purpose

**Needs product input** for the domain endpoints. What _is_ clear from code:
`/admin/master-data/api-call-examples` is an **internal component showcase**
(decided) — 13 runnable request patterns intended as a reference for developers,
not a user-facing feature.

---

## 2. Entry points

| Path                                    | Component              | Purpose               |
| --------------------------------------- | ---------------------- | --------------------- |
| `/admin/master-data/api-call-examples`  | `ApiCallExamplesPage`  | 13 runnable patterns  |
| `/admin/master-data/api-call-scenarios` | `ApiCallScenariosPage` | Scenario walkthroughs |

### Modules

| Module                | Exports                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------ |
| `api/axiosClient.ts`  | `createApiClient`, `apiClient`, `PROJECT_HEADER`                                           |
| `api/goApiClient.ts`  | `goApiClient`                                                                              |
| `api/request.ts`      | `get`, `post`, `put`, `patch`, `del`, `buildListQuery`, `RequestOptions`, `ListQueryInput` |
| `api/queryClient.ts`  | `queryClient`, `shouldRetryRequest`                                                        |
| `api/queryKeys.ts`    | `queryKeys`                                                                                |
| `api/apiTelemetry.ts` | `startRequestTrace`, `completeRequestTrace`, `logApiFailure`, `CORRELATION_HEADER`         |
| `utils/errors.ts`     | `normalizeError`, `getUserMessage`                                                         |
| `types/api.ts`        | `AppError`, `isAppError`, `PaginatedResponse`                                              |

---

## 3. User flows

### Primary — a list screen loads

1. Component calls `useProducts(filters)`.
2. Cache miss → `queryFn({ signal })` runs.
3. Service builds params via `buildListQuery` and calls `get()`.
4. Interceptors add headers, correlation ID, timing.
5. 200 → typed data; the component renders.

### Alternate — filters change

The key embeds the filters, so a new key means a new fetch.
`placeholderData: keepPreviousData` keeps the previous list on screen instead of
flashing a skeleton.

### Alternate — a token expires mid-session

1. Request returns 401.
2. Interceptor calls `refreshAuthToken()` **once per request** (tracked in a
   `WeakSet`) and shares one in-flight refresh promise across concurrent 401s.
3. Success → the original request is retried with the new token.
4. Failure → `onAuthFailure()` fires and the error propagates as `kind: 'auth'`.

### Alternate — the user navigates away mid-request

React Query aborts the `signal`; Axios cancels; `normalizeError` returns
`kind: 'canceled'`; the retry policy declines to retry; telemetry **skips** it.

### Failure — server error

500 → `AppError { kind:'api', status:500 }` → retried up to 2 times with
exponential backoff → still failing → logged to the `api` channel → a toast if
the query already had data, or an inline error on first load.

---

## 4. Architecture

```
Component
   │  never imports axios
   ▼
Hook (hooks/*.ts)                 useQuery / useMutation, keys, invalidation
   │  queryFn({ signal })
   ▼
Service (services/*.ts)           endpoint paths, response typing
   │
   ▼
request.ts                        get/post/put/patch/del, buildListQuery
   │
   ▼
axiosClient (factory)             baseURL, headers, auth, refresh, normalise
   │  ├── request interceptor  → PROJECT_HEADER, Authorization, startRequestTrace
   │  └── response interceptor → completeRequestTrace | refresh+retry | logApiFailure
   ▼
HTTP  →  AppError on the failure path
```

### Why a factory rather than one client

`createApiClient(options)` builds an instance with the same interceptor
behaviour but a different base URL. Two backends exist; overloading one client
with two unrelated base URLs would mean per-call overrides everywhere.

| Client        | Base URL                         | Timeout       |
| ------------- | -------------------------------- | ------------- |
| `apiClient`   | `https://dummyjson.com`          | 15s (default) |
| `goApiClient` | `VITE_GO_API_BASE_URL ?? '/api'` | 10s           |

`goApiClient` defaults to the **relative** `/api`, which resolves in every
environment without CORS config: Vite proxies it in dev, nginx proxies it in
Docker.

---

## 5. The error contract

```ts
export type AppError =
  | {
      kind: 'api';
      message: string;
      status: number;
      code?: string;
      fieldErrors?: Record<string, string>;
    }
  | { kind: 'auth'; message: string; status: 401 | 403 }
  | { kind: 'network'; message: string }
  | { kind: 'timeout'; message: string }
  | { kind: 'canceled'; message: string }
  | { kind: 'validation'; message: string; fieldErrors: Record<string, string> }
  | { kind: 'unknown'; message: string; cause?: unknown };
```

`normalizeError` maps every input to one of these:

| Input                        | Result                                                  |
| ---------------------------- | ------------------------------------------------------- |
| Already an `AppError`        | returned unchanged                                      |
| `axios.isCancel`             | `canceled`                                              |
| `ECONNABORTED` / `ETIMEDOUT` | `timeout`                                               |
| Axios error, no response     | `network`                                               |
| 401 / 403                    | `auth`                                                  |
| Any other response           | `api` (with server `message`/`error`, `code`, `errors`) |
| `DOMException` `AbortError`  | `canceled`                                              |
| `Error`                      | `unknown` with `cause`                                  |
| Anything else                | `unknown`                                               |

`getUserMessage` is the **only** place user-facing wording is chosen. Network and
timeout get friendly text; `api`/`validation`/`unknown` pass the server message
through.

**Note.** `kind: 'auth'` narrows `status` to `401 | 403`. A sign-in service
returning 502 or 503 is therefore `kind: 'api'` — see
[authentication](#8-authentication).

---

## 6. Caching, keys, invalidation, cancellation

### Keys

One hierarchy, in `queryKeys.ts`. Keys embed their inputs, so a filter change is
a new key and refetch is automatic:

```ts
products: {
  all:   ['products'] as const,
  list:  (filters: ProductListFilters) => [...queryKeys.products.all, 'list', filters] as const,
  detail:(id: number)                  => [...queryKeys.products.all, 'detail', id] as const,
}
```

Because `list` and `detail` are built from `all`, invalidating `products.all`
invalidates every product query at once.

### Shared query options

`queryOptions()` co-locates key + fn + cache config so the same object serves
`useQuery`, `prefetchQuery` and `ensureQueryData`:

```ts
export function productsListOptions(filters: ProductListFilters) {
  return queryOptions({
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ signal }) => fetchProducts(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useProducts(filters: ProductListFilters) {
  return useQuery(productsListOptions(filters));
}
```

### Defaults

| Option                 | Value                  | Reason                                             |
| ---------------------- | ---------------------- | -------------------------------------------------- |
| `staleTime`            | 30s                    | Avoids refetching on every mount during navigation |
| `gcTime`               | 5min                   | Cache survives a round trip away from a screen     |
| `refetchOnWindowFocus` | `false`                | Alt-tabbing should not restart requests            |
| `retry` (queries)      | `shouldRetryRequest`   | See below                                          |
| `retryDelay`           | `min(1000 · 2^n, 30s)` | Exponential backoff, capped                        |
| `retry` (mutations)    | `0`                    | A retried write may double-apply                   |

### Retry policy

```ts
export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (isAppError(error)) {
    if (error.kind === 'api' && error.status < 500) return false;
    if (error.kind === 'auth' || error.kind === 'canceled' || error.kind === 'validation')
      return false;
  }
  return failureCount < 2;
}
```

A 4xx will not succeed on retry; a cancellation was deliberate; a validation
failure is the caller's. Everything else gets two attempts. Pure, and
directly unit-tested.

### Invalidation

| Hook                        | On success                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `useCreateProduct`          | `invalidateQueries({ queryKey: queryKeys.products.all })`                            |
| `useCreateOrder`            | `invalidateQueries({ queryKey: queryKeys.orders.all })`                              |
| `useInvalidateUsers`        | exposes invalidation for the caller to trigger                                       |
| `useOptimisticProductTitle` | `cancelQueries` → `setQueryData` → rollback on error → `invalidateQueries` on settle |

### Cancellation

Every `queryFn` receives `{ signal }` and threads it to the service, which passes
it to Axios. Three consequences: navigating away aborts in flight; a superseded
search does not overwrite a newer one; canceled requests are excluded from retry
and from the error log.

---

## 7. Global error surfacing

```ts
queryCache.onError: (error, query) => {
  // Initial-load errors render inline via QueryGate; only background refetch
  // failures (stale data on screen) surface as a toast.
  if (query.state.data !== undefined) snackbar.error(getUserMessage(error));
}

mutationCache.onError: (error, _v, _c, mutation) => {
  if (mutation.meta?.silenceGlobalError === true) return;
  snackbar.error(getUserMessage(error));
}
```

Two deliberate rules:

- **First load fails → inline, not a toast.** The screen is empty; a toast over
  an empty screen is worse than a message in it.
- **Forms opt out.** `meta.silenceGlobalError` lets a form render its own error
  rather than showing both. Used by `useCreateProduct`, `useCreateUser`, and the
  scenario hooks.

---

## 8. Authentication

### How it works

The request interceptor calls `options.getAuthToken?.()` per request — the
default client passes `getStoredAuthToken`, which reads sessionStorage and does
**not** depend on React state, so the interceptor never goes stale.

On 401, refresh happens **once per request** (`refreshedRequests` WeakSet) and
concurrent 401s share one refresh promise (`refreshPromise ??=`).

### Sign-in

`authService.login` has three paths, chosen by configuration rather than by a
developer remembering to change code:

| Condition                | Behaviour                                                                    |
| ------------------------ | ---------------------------------------------------------------------------- |
| `VITE_AUTH_ENDPOINT` set | POST credentials there; response **shape-checked** before becoming a session |
| Unset, dev/test          | Local mock: any non-empty credentials; role derived from the username        |
| Unset, production build  | **Refuses** — `'Sign-in is not configured for this deployment.'`             |

A malformed response from a real endpoint is rejected with a 502-shaped error
rather than trusted, because trusting it would mean **inventing a role**, and
inventing a role means inventing permissions.

### Limitations — read this before deploying

1. **There is no authentication backend.** The Go service exposes exactly
   `GET /health` and `GET /api/items` (`api/cmd/server/main.go:47-48`) with no
   auth middleware. `VITE_AUTH_ENDPOINT` has nothing to point at yet.
2. **The mock accepts any credentials.** It cannot run in a production build, but
   in development anyone can sign in as anyone.
3. **Authorization is client-side only.** `ProtectedRoute` and `usePermission`
   decide what to _render_. Nothing is enforced server-side.
4. **The token is a fixed string** (`'demo-jwt-token'`) with no expiry, so the
   refresh path is real code with no way to exercise it end to end.

**Recommended:** a login endpoint issuing a signed token with the role as a
claim, auth middleware on the Go service, and server-side capability checks
mirroring `auth/permissions.ts`.

---

## 9. Request helpers

```ts
export async function get<TResponse>(
  url: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { client = apiClient, ...config } = options;
  const response = await client.get<TResponse>(url, config);
  return response.data;
}
```

Each helper unwraps `.data`, so services return domain types and no caller
touches an Axios response. `client` is a `RequestOptions` field, which is how
`itemService` targets the Go backend:

```ts
return get<Item[]>('/items', { client: goApiClient, signal });
```

### `buildListQuery`

Normalises paging/sorting/search/filters and **bounds them**:

```ts
const page = Math.max(0, Math.trunc(input.page ?? 0));
const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize ?? 20)));
```

Page size is clamped to 1–100 and truncated, so a caller cannot request 10,000
rows through a URL. Empty strings, `null` and `undefined` filters are dropped
rather than sent as blanks.

---

## 10. Telemetry

`api/apiTelemetry.ts` is the **single capture point** for the `api` log channel —
no request can fail without appearing in the console.

| Step    | What happens                                                                                                              |
| ------- | ------------------------------------------------------------------------------------------------------------------------- |
| Request | `startRequestTrace` stamps `X-Correlation-Id`, starts a timing transaction, stores it in a `WeakMap` keyed by config      |
| Success | `completeRequestTrace` closes the transaction, drops an `http` breadcrumb                                                 |
| Failure | `logApiFailure` writes one entry: endpoint, method, status, duration, correlation ID, normalised kind, raw server message |

A `WeakMap` rather than a property on the Axios config: nothing is added to an
object Axios owns and serialises, and traces are collected with the config.

**Cancellations are skipped deliberately** — React Query aborts on unmount as
normal operation, and logging them buries real failures.

Full detail: [error-monitoring-console.md](error-monitoring-console.md).

---

## 11. The 13 patterns

`ApiCallExamplesPage` demonstrates each pattern against the same typed services:

| #   | Pattern             | Mechanism                                                      |
| --- | ------------------- | -------------------------------------------------------------- |
| 1   | Plain call          | `useMutation` → service                                        |
| 2   | Retry               | disabled query, `retry: 2`, exponential backoff                |
| 3   | Parallel            | `useQueries`                                                   |
| 4   | Sequential          | one mutation awaiting three services in order                  |
| 5   | Dependent           | second query `enabled` only once the first supplies its input  |
| 6   | Fullscreen spinner  | parent-owned overlay                                           |
| 7   | Icon spinner        | in-button progress                                             |
| 8   | With snackbar       | parent decides when to notify                                  |
| 9   | Standard error      | missing resource → normalised `AppError`                       |
| 10  | With store          | external store records history; server data stays in the cache |
| 11  | With localStorage   | guarded persistence via `safeLocalStorage`                     |
| 12  | Background prefetch | `prefetchQuery` warms the cache, page stays interactive        |
| 13  | Internal scheduler  | `refetchInterval` polling with auto-restart                    |

Scenario 13 is also the clearest example of a rendering rule: it keeps
`status: 'success'` across background refetches so the result text updates in
place instead of unmounting and remounting on every tick.

---

## 12. Best-practice justification

| Practice                          | Code evidence                                | Justification                                                                              | Trade-off                                                               |
| --------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| **Centralised transport**         | `createApiClient` (`axiosClient.ts:25`)      | Auth, headers, refresh and normalisation are written once; a component cannot forget them. | Two indirections between a component and the network.                   |
| **UI never imports Axios**        | Pages import hooks/services only             | Components are testable without HTTP mocking; the transport can be replaced.               | More files per endpoint (service + hook).                               |
| **Normalised errors**             | `normalizeError` (`errors.ts:13`)            | Every consumer switches on one union instead of sniffing Axios shapes.                     | A new failure mode needs a new `kind`.                                  |
| **One place for user wording**    | `getUserMessage` (`errors.ts:54`)            | Messages cannot drift between screens.                                                     | Per-screen phrasing needs a wrapper.                                    |
| **Cancellation threaded through** | `queryFn: ({ signal }) => fetchX(…, signal)` | Abandoned work stops; stale responses cannot overwrite fresh ones.                         | Every service takes a `signal` parameter.                               |
| **Key hierarchy**                 | `queryKeys.ts`                               | Invalidating a parent key invalidates its children; no string literals in components.      | The key file must be edited for every new entity.                       |
| **Shared `queryOptions`**         | `productsListOptions`                        | Hook, prefetch and `ensureQueryData` cannot disagree about config.                         | One more exported function per entity.                                  |
| **Retry as a pure function**      | `shouldRetryRequest`                         | Directly unit-testable; the policy is legible in one place.                                | Global; a per-query exception needs an override.                        |
| **Mutations never retry**         | `mutations: { retry: 0 }`                    | A retried write may double-apply.                                                          | A genuinely idempotent write must opt in.                               |
| **Per-call toast opt-out**        | `meta.silenceGlobalError`                    | Forms show one error, not two.                                                             | An undocumented meta key would be easy to miss — it is used in 4 hooks. |
| **Bounded list params**           | `buildListQuery` clamps 1–100                | A hostile or buggy caller cannot request unbounded rows.                                   | A legitimate need for >100 requires changing the helper.                |
| **Single telemetry point**        | `logApiFailure` (`apiTelemetry.ts:67`)       | No request can fail unlogged.                                                              | Every failure allocates a log entry.                                    |
| **Trace via `WeakMap`**           | `apiTelemetry.ts:32`                         | Nothing is added to Axios's config object; entries are collected automatically.            | Slightly less obvious than a property.                                  |
| **Separate client per backend**   | `goApiClient`                                | Two base URLs without per-call overrides.                                                  | Two instances to configure.                                             |
| **Relative `/api` default**       | `goApiClient.ts`                             | Works in dev, Docker and prod with no CORS setup.                                          | Depends on a proxy being configured.                                    |

---

## 13. Testing

| File                           | Tests | Covers                                                                                                                                  |
| ------------------------------ | ----- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `api/api.test.ts`              | 4     | Project + auth headers on every request; **401 refresh-once then retry**; `buildListQuery` bounds; retry policy across kinds            |
| `api/apiTelemetry.test.ts`     | 4     | Correlation header present; one entry per failure with endpoint/method/status/duration; success logs nothing; **cancellations skipped** |
| `utils/errors.test.ts`         | 13    | Every `normalizeError` branch and `getUserMessage` mapping                                                                              |
| `services/authService.test.ts` | 5     | Empty credentials rejected; role derived from username; session persisted/restored; mock reported; **corrupt session ignored**          |

**26 tests.** Tests swap `client.defaults.adapter` after construction rather than
adding a test-only option to `ApiClientOptions`, so the interceptors under test
are the real ones.

```bash
cd frontend/react
pnpm exec vitest run src/api src/utils/errors.test.ts src/services/authService.test.ts
```

**Limitation.** No test covers `goApiClient`'s relative-URL resolution or the
Vite/nginx proxy behaviour — those are environment concerns.

---

## 14. Limitations and trade-offs

| #   | Limitation                                                                                                                        |
| --- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **No auth backend** (§8). The whole authentication story is a client-side scaffold.                                               |
| 2   | **Mock accepts any credentials** in dev.                                                                                          |
| 3   | **Authorization is not enforced server-side.**                                                                                    |
| 4   | **The demo data source is dummyjson.com**, a public API. Products and users are not real data, and writes do not persist.         |
| 5   | **`kind: 'auth'` cannot express 5xx from an auth service** — `status` is narrowed to `401 \| 403`, so those become `kind: 'api'`. |
| 6   | **`meta.silenceGlobalError` is stringly-typed** through React Query's `meta`, so a typo silently does nothing.                    |
| 7   | **`buildListQuery` assumes dummyjson's dialect** (`limit`/`skip`/`q`/`order`). Another backend needs a second builder.            |
| 8   | **No request deduplication beyond React Query's**, and no circuit breaker.                                                        |
| 9   | **Retry policy is global.** A per-query exception requires overriding `retry` at the call site.                                   |
| 10  | **No offline queueing.** Offline is detected and logged, but writes are not replayed.                                             |

---

## 15. Extension guide

### Add an endpoint

1. **Service** — one function, typed, taking an optional `signal`:

```ts
export async function fetchInvoice(id: number, signal?: AbortSignal): Promise<Invoice> {
  return get<Invoice>(`/invoices/${String(id)}`, { signal });
}
```

2. **Key** — add to the hierarchy:

```ts
invoices: {
  all:    ['invoices'] as const,
  detail: (id: number) => [...queryKeys.invoices.all, 'detail', id] as const,
},
```

3. **Hook** — share the options object:

```ts
export function invoiceOptions(id: number) {
  return queryOptions({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: ({ signal }) => fetchInvoice(id, signal),
    staleTime: 30_000,
  });
}
export const useInvoice = (id: number) => useQuery(invoiceOptions(id));
```

4. **Component** — call the hook. Nothing else.

### Add a mutation that invalidates

```ts
export function useCreateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInvoice,
    meta: { silenceGlobalError: true }, // only if the form shows its own error
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
    },
  });
}
```

### Add a third backend

```ts
export const billingClient = createApiClient({
  baseURL: import.meta.env.VITE_BILLING_BASE_URL ?? '/billing',
  timeoutMs: 20_000,
  getAuthToken: getStoredAuthToken,
});
```

Declare the env var in `src/global.d.ts`, then pass `{ client: billingClient }`
in the service. Interceptors, telemetry and error normalisation come for free.

### Wire a real auth endpoint

Set `VITE_AUTH_ENDPOINT`. The response must satisfy:

```ts
{ token: string, user: { username: string, displayName?: string, role: 'admin' | 'user' } }
```

`isLoginResponse` rejects anything else. No frontend code changes.

---

## 16. Evidence index

| Claim                                       | File                                    | Line           |
| ------------------------------------------- | --------------------------------------- | -------------- |
| Client factory                              | `frontend/react/src/api/axiosClient.ts`       | 25             |
| Project + auth headers                      | `frontend/react/src/api/axiosClient.ts`       | 32–41          |
| Refresh-once WeakSet                        | `frontend/react/src/api/axiosClient.ts`       | 44             |
| Shared refresh promise                      | `frontend/react/src/api/axiosClient.ts`       | 56             |
| Failure logged, then rejected as `AppError` | `frontend/react/src/api/axiosClient.ts`       | 71–75          |
| `normalizeError`                            | `frontend/react/src/utils/errors.ts`          | 13             |
| `getUserMessage`                            | `frontend/react/src/utils/errors.ts`          | 54             |
| `AppError` union                            | `frontend/react/src/types/api.ts`             | 5              |
| `isAppError` guard                          | `frontend/react/src/types/api.ts`             | 32             |
| Retry policy                                | `frontend/react/src/api/queryClient.ts`       | 7              |
| Inline-vs-toast rule                        | `frontend/react/src/api/queryClient.ts`       | 19–25          |
| `silenceGlobalError`                        | `frontend/react/src/api/queryClient.ts`       | 29             |
| Query defaults                              | `frontend/react/src/api/queryClient.ts`       | 33–44          |
| Key hierarchy                               | `frontend/react/src/api/queryKeys.ts`         | 9              |
| `buildListQuery` bounds                     | `frontend/react/src/api/request.ts`           | 23             |
| `get` unwraps `.data`                       | `frontend/react/src/api/request.ts`           | 40             |
| Shared `queryOptions`                       | `frontend/react/src/hooks/useProducts.ts`     | 14             |
| Signal threaded                             | `frontend/react/src/hooks/useProducts.ts`     | 17             |
| Invalidate on create                        | `frontend/react/src/hooks/useProducts.ts`     | 34             |
| Optimistic + rollback                       | `frontend/react/src/hooks/useApiScenarios.ts` | 150, 159       |
| `cancelQueries`                             | `frontend/react/src/hooks/useApiScenarios.ts` | 127            |
| `prefetchQuery`                             | `frontend/react/src/hooks/useApiScenarios.ts` | 134            |
| Polling scenario                            | `frontend/react/src/hooks/useApiScenarios.ts` | 103            |
| Correlation header                          | `frontend/react/src/api/apiTelemetry.ts`      | 20             |
| Trace WeakMap                               | `frontend/react/src/api/apiTelemetry.ts`      | 32             |
| Single failure capture                      | `frontend/react/src/api/apiTelemetry.ts`      | 67             |
| Cancellations skipped                       | `frontend/react/src/api/apiTelemetry.ts`      | 68             |
| Second backend client                       | `frontend/react/src/api/goApiClient.ts`       | 17             |
| Go client targeting                         | `frontend/react/src/services/itemService.ts`  | 8              |
| Token read outside React                    | `frontend/react/src/services/authService.ts`  | 159            |
| API foundation tests                        | `frontend/react/src/api/api.test.ts`          | 15, 31, 61, 82 |
| Telemetry tests                             | `frontend/react/src/api/apiTelemetry.test.ts` | —              |
