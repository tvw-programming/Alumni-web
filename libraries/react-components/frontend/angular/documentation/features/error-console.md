# Error and monitoring console

Three channels, one tab each, at `/admin/master-data/error-log`.

| Channel | Holds | Written by |
| --- | --- | --- |
| `api` | Every non-2xx, network failure and timeout | [`api-telemetry.ts`](../../src/app/core/http/api-telemetry.ts) — the single capture point |
| `app` | Uncaught exceptions, rejections, console errors, denied routes, blocked form submits | each capture point, tagged with `context.kind` |
| `test` | Unit test results | the Vitest reporter, via an artifact |

## Storage

[`error-logger.ts`](../../src/app/core/errors/error-logger.ts) is **ported
verbatim** from React with its 11 tests. Entries go to a rotating
`localStorage` buffer (max 500) and to the monitoring sink — the console in
development, `ERROR_LOG_ENDPOINT` in production.

Logging never throws. A logging failure must stay invisible to the user-facing
flow.

## The signal bridge

Because the logger is framework-free, it publishes through a callback
`subscribe`. [`ErrorLogStore`](../../src/app/core/errors/error-log-store.ts) is
the **single place** that becomes a signal — every consumer reads `entries()`
and nothing else in the app subscribes.

React needed `useSyncExternalStore` in each consumer. One root service replaces
all of them, and the subscription is established once for the app's life rather
than once per mounted view.

## Per-channel state

[`channelView(channel)`](../../src/app/features/admin/error-log/channel-view.ts)
is React's `useErrorLog` as a factory returning signals: entries, filters,
grouping, counts. Filter state lives here rather than in each tab, which is what
keeps the three tabs thin — they choose a channel and a set of columns, and
share every behaviour.

Two behaviours worth stating, both tested:

- **Counts describe the channel, not the filtered view.** The chips must not
  shrink as you type in the search box.
- **Clearing one channel leaves the others intact.** Clearing is evidence
  destruction, so it is gated on `diagnostics:manage` — a separate capability
  from `diagnostics:read`, which merely opens the console.

## Columns are data

React rendered each cell with `(entry) => ReactNode`. That does not port — a
function cannot return an Angular template. A column instead declares *what kind*
of cell it is and how to read its text:

```ts
export interface ErrorLogColumn {
  key: string; label: string;
  align?: 'left' | 'right';
  kind?: 'text' | 'mono' | 'level' | 'severity';
  value: (entry: ErrorLogEntry) => string;   // must be total
  tooltip?: (entry: ErrorLogEntry) => string | null;
}
```

This is the better shape regardless: a column is plain data with no rendering
logic in it, so it is trivially testable and could be serialised if columns ever
became configurable.

The table is a plain `<table>`, not `MatTable`. The data is already a signal and
the table is read-only; `MatTable`'s value is its DataSource plumbing — sorting,
pagination, selection — none of which is wanted. A semantic table with a
`<caption>` and scoped headers is also better for screen readers.

## Grouping

`groupByFingerprint` collapses duplicates; the count renders as `×N` with the
fingerprint in a tooltip. A fingerprint is derived from the error and its
source, so the same failure recurring 200 times is one row, not 200.

## Unit tests tab

Tests run in Node, so the browser cannot observe them. The Vitest reporter
writes an artifact and the tab reads it — the artifact is the entire hand-off,
and [`test-report.types.ts`](../../src/app/core/errors/test-report.types.ts) is
the contract between them.

### Running tests from the UI

There is a **Run unit tests** button, gated on `IS_DEV` **and**
`diagnostics:manage`.

Angular's application builder exposes **no dev-server middleware hook** — there
is no supported way to add an endpoint the way the React app does from its Vite
config. So the endpoint is a loopback-only sidecar
([`tools/test-runner-server.mjs`](../../tools/test-runner-server.mjs)) and
`proxy.conf.json` forwards to it. The browser sees one origin: no CORS, no
second URL to know about.

```bash
pnpm dev     # dev server + runner. `pnpm start` is the dev server alone.
```

It executes a shell command, so it binds to `127.0.0.1` and is started only by
`pnpm dev`. The UI's checks are conveniences; those constraints are the control.

### Why the report is not in `public/`

The reporter writes `.test-output/test-report.json`, and the sidecar serves it.

The first version wrote into `public/`. The dev server watches that directory,
so finishing a run triggered a **live reload mid-run** — the page reset and the
operator lost the tab they were watching. Writing outside it keeps the run
invisible to the builder.

It also means test results, a development diagnostic, never ship in a production
bundle. Outside `pnpm dev` the tab honestly says nothing is serving the report.

**Verified**: clicking Run advanced the report timestamp 09:16:17 → 09:17:48
with **zero page reloads**.

## Verified end to end

Against errors generated first — a real 404 from API scenario 9, a real
validation block from the users form:

- API tab: the 404 with method, endpoint, status, `1130ms` duration, correlation ID
- Application tab: `FORM_VALIDATION_BLOCKED` with source, `file:line`, route
- Tab badges show live per-channel counts
- Search narrows to an empty state and back
