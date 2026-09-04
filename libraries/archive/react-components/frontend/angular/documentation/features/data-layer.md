# Data layer

## Transport

One [`HttpInterceptorFn`](../../src/app/core/http/api.interceptor.ts) does what
Axios's request/response pair did: stamp headers, time the request, and log
every failure exactly once as a normalised `AppError`.

### Headers are conditional, and this was found the hard way

Internal headers (`projName`, `X-Correlation-Id`, `Authorization`) go **only to
our own origin**.

1. **CORS.** A custom header turns a simple cross-origin GET into a preflighted
   one. A third-party API that does not list our headers in
   `Access-Control-Allow-Headers` fails the preflight and the request never
   completes — which is exactly what happened against the demo data source.
2. **Secrecy.** `Authorization` is a bearer token. Sending it to a host we do
   not control leaks a credential for no benefit.

```ts
function isOwnBackend(url: string): boolean {
  if (!/^https?:\/\//i.test(url)) return true; // relative → same origin
  try { return new URL(url).origin === globalThis.location.origin; }
  catch { return false; }
}
```

Timing and failure logging apply to **every** request regardless, because those
are ours no matter who serves the response.

## Reads: `httpResource`

[`ProductService`](../../src/app/features/products/product.service.ts) is the
reference shape:

```ts
readonly products = httpResource<ProductListResponse>(() => {
  this.cache.version(queryKeys.products.all);   // subscribe to invalidation
  const { page, pageSize, search } = this.filters();
  return { url: `${API_BASE_URL}/products${search ? '/search' : ''}`, params };
});
```

Three properties worth naming:

- **Value, loading and error are signals.** A template reads
  `products.isLoading()` with no destructuring and no `async` pipe.
- **The request function is reactive.** Reading `filters()` inside it means
  changing a filter re-issues the request. This is the same effect React got by
  embedding filters in a query key — without a key.
- **Invalidation is explicit**, because `httpResource` has none.

Page services are **component-provided**, not root. A root resource would
outlive its page and hold a stale list for the app's lifetime.

## Invalidation: `QueryCache`

[`QueryCache`](../../src/app/core/http/query-cache.ts) caches **invalidation
signals, not responses**:

```ts
version(key: readonly unknown[]): number { return this.versionSignal(serialize(key))(); }

invalidate(key: readonly unknown[]): void {
  const prefix = serialize(key);
  for (const [serialized, version] of this.versions) {
    if (serialized === prefix || serialized.startsWith(`${prefix} `)) {
      version.update((n) => n + 1);
    }
  }
}
```

Segments are joined with a **space delimiter**, so prefix invalidation cannot
over-match: `['product']` does not invalidate `['products']`.

`serializeSegment` narrows primitives explicitly rather than using
`typeof !== 'object'`. That check leaves symbols in, and `String(symbol)`
throws — which would take down whichever request happened to be building its
cache key at the time.

**Limitation.** No `staleTime`, no background refetch, no refetch-on-focus.

## Writes

There is no `useMutation`. A write is an async method plus signals:

```ts
async create(user: NewUser): Promise<User> {
  this.creating.set(true);
  try { return await firstValueFrom(this.http.post<User>(url, user)); }
  finally { this.creating.set(false); }   // a rejection must not stick the form
}
```

### Writes deliberately do not invalidate

`UserService.create` and `ProductService.update` **do not** call `invalidate()`.
The response already carries the row, so the caller inserts it directly; a
refetch would discard that insert along with the user's scroll position and
filters. On the demo API, which does not persist writes, the row would vanish
entirely.

### Inserting a row: use a signal, not a grid transaction

```ts
private readonly createdUsers = signal<User[]>([]);
protected readonly rows = computed(() => [...this.createdUsers(), ...fetched()]);
```

React reached for `gridApi.applyTransaction({ addIndex: 0 })`. The signal is
better here: the row is part of `rowData` like any other, so it sorts and
filters normally, it survives a grid re-creation, and the page needs no
imperative grid handle at all.

> **Measurement note.** AG Grid position-absolutes and recycles its rows, so
> `document.querySelectorAll('.ag-row')` returns them in **DOM order, not visual
> order**. Verifying "is the new row first" requires sorting by bounding rect.
> Several apparent bugs during this port were this measurement mistake.

## Cancellation

Covered in [react-to-angular.md](../react-to-angular.md#2-httpresource-does-not-cancel-in-flight-requests).
Short version: **`httpResource` does not abort; `resource()` does.**

```ts
readonly delayed = resource<Product, number | null>({
  params: () => this.delayedId(),
  loader: async ({ params: id, abortSignal }) => {
    if (id === null) return undefined as unknown as Product;
    const response = await fetch(url, { signal: abortSignal });
    ...
  },
});
```

**Verified**: `net::ERR_ABORTED, canceled: true`, 0.9 s after the Cancel click.

## Failure normalisation

[`normalize-error.ts`](../../src/app/core/errors/normalize-error.ts) is the
React file with Axios branches swapped for `HttpErrorResponse`. Every failure
becomes an `AppError` with a `kind`, so call sites never inspect a framework
object.

Status `0` is a network failure **unless** the underlying cause is an
`AbortError`, in which case the kind is `canceled` — and
[`api-telemetry.ts`](../../src/app/core/http/api-telemetry.ts) skips logging
those. Aborting an in-flight request is normal operation, not an incident, and
logging it would fill the API channel with noise every time a user navigated.

## The 13 request patterns

[`api-examples.service.ts`](../../src/app/features/admin/api-examples.service.ts)
holds them; all 13 are **Verified** running in a browser.

The retry pattern is worth calling out as opt-in only:

```ts
async productWithRetry(id: number, attempts = 3): Promise<Product> { ... }
```

Retrying is deliberately not automatic anywhere else: a retry on a
non-idempotent request can duplicate work, and a retry on a 404 only wastes
time.
