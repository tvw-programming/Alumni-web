## Component Specification

### Name & Purpose
The data layer — `httpResource` for reads, plain async methods for writes, and a
small `QueryCache` for invalidation. Replaces TanStack Query, which has no
Angular equivalent.

### Location
`src/app/core/http/query-cache.ts`, `query-keys.ts`, `api.interceptor.ts`,
`api-telemetry.ts`; per-feature services under `src/app/features/*/`

### Public Interface

```ts
@Injectable({ providedIn: 'root' })
export class QueryCache {
  version(key: readonly unknown[]): number;   // read inside a request fn to subscribe
  invalidate(key: readonly unknown[]): void;  // prefix-invalidates
  invalidateAll(): void;
}

export const apiInterceptor: HttpInterceptorFn;
export const queryKeys: { products: { all; list(filters); detail(id) }, users: {…} };
```

Reference read, from `ProductsApiService`:

```ts
readonly list = httpResource<ProductPage>(() => {
  this.cache.version(queryKeys.products.all);   // subscribe to invalidation
  const p = this.params();                      // reactive: changing it refetches
  return { url: '/api/products', params };
});
readonly items   = computed(() => this.list.value()?.items ?? []);
readonly isLoading = computed(() => this.list.isLoading());
```

### Dependencies
- Internal: `core/errors/normalize-error`, `core/config/app-config`.
- External: `@angular/common/http`.

### Data Models
Owns none. `queryKeys` is the key hierarchy; `QueryCache` caches **invalidation
signals, not responses**.

### Business Rules & Constraints

**`httpResource` vs `resource` — this is a trap, and it was measured.**

Clearing the signal an `httpResource` depends on moves the *resource* to idle,
but the HTTP request it already started **runs to completion**. Observed over
CDP: sent at 28.2 s, finished at 33.0 s — 3.9 s *after* the user clicked Cancel.

`resource()` hands its loader a real `AbortSignal`:

```ts
readonly delayed = resource<Product, number | null>({
  params: () => this.delayedId(),
  loader: async ({ params: id, abortSignal }) => {
    const response = await fetch(url, { signal: abortSignal });
    …
  },
});
```
Verified: `net::ERR_ABORTED, canceled: true`, 0.9 s after the click.

> **Rule.** `httpResource` is the right default. When cancellation must reach the
> wire, use `resource()` with its `abortSignal`.

**Invalidation is explicit.** `httpResource` has none, so a request function
reads `cache.version(key)`; bumping it changes the request identity and Angular
refetches. Segments are joined with a **space delimiter**, so `['product']`
cannot invalidate `['products']`.

**Writes are plain async methods plus signals.** There is no `useMutation` —
`resource` is for state that *derives* from a request, not for a command.

**Writes deliberately do not invalidate.** The response already carries the row,
so the caller inserts it directly; a refetch would discard that insert along with
scroll position and filters.

**Internal headers go only to our own origin:**

```ts
const outbound = isOwnBackend(request.url) ? request.clone({ setHeaders: {…} }) : request;
```
A custom header turns a simple cross-origin GET into a preflighted one that a
third-party server will not satisfy — that is why the demo API's requests hung —
and `Authorization` sent to a host we do not control is a leaked credential.

**Not implemented:** `staleTime`, background refetch, refetch-on-focus.

### Extension Points

- **A new list endpoint:** a component-provided service with an `httpResource`
  whose request function reads a params signal.
- **A new write:** an async method plus a `creating`/`saving` signal.
- **Cancellable work:** `resource()`, not `httpResource`.
