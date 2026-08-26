# Error handling, logging and monitoring

Two layers of error handling, one log, three channels.

## Layers

| Layer                    | File                                     | Catches                                                                      |
| ------------------------ | ---------------------------------------- | ---------------------------------------------------------------------------- |
| Normalizer               | `utils/errors.ts`                        | Turns anything thrown into a typed `AppError`                                |
| Transport                | `api/apiTelemetry.ts`                    | Every failed request (single capture point for the API channel)              |
| Component-level fallback | `components/errors/AppErrorBoundary.tsx` | Render-time crashes                                                          |
| Route-level fallback     | `components/errors/RouteErrorView.tsx`   | Loader/route failures and 404s                                               |
| Process-level            | `utils/globalErrorHandlers.ts`           | Uncaught errors, unhandled rejections, chunk loads, offline, `console.error` |

Every layer routes its user-facing message through the same
`normalizeError` → `getUserMessage` pair, so wording never diverges, and its
persistence through the same `logError`.

## The log

`utils/errorLogger.ts` owns persistence and enrichment. It decides nothing about
_what_ is an error, and it never throws — logging must not be the thing that
breaks the app.

Every entry is written to a rotating localStorage buffer (max 500) **and** handed
to `monitoring.report()`. Entries carry channel, level, severity, fingerprint,
session, release, route, correlation ID, duration and breadcrumbs.

`level` says how loudly to report; `severity` says how much it matters. A 404 is
`warning`/`warning`; a failed chunk load is `error`/`fatal` because the user is
stuck.

### Channels

- **`api`** — a request failed. Written only by `api/apiTelemetry.ts`, from the
  Axios response interceptor, so no request can fail without appearing.
  Cancellations are skipped: React Query aborts in-flight requests on unmount as
  normal operation.
- **`app`** — everything else the running app produced: boundary crashes, route
  failures, uncaught errors, unhandled rejections, chunk-load failures, mirrored
  `console.error`, offline events.
- **`test`** — unit-test failures, read from a build-time artifact (below).

## Monitoring

`utils/monitoring.ts` deliberately owns no transport. It collects context —
session ID, correlation IDs, breadcrumbs (25-entry ring), transaction timing,
fingerprints, severity, release tag — and hands finished entries to a _sink_.

Default sink: console in dev, `VITE_ERROR_LOG_ENDPOINT` in production, nothing if
that is unset. To ship to a vendor instead, install a sink once at startup — no
call site changes:

```ts
import * as Sentry from '@sentry/react';
import { setMonitoringSink } from '@/utils/monitoring';

setMonitoringSink((entry) => {
  Sentry.captureEvent({
    message: entry.errorDescription,
    level: entry.severity === 'fatal' ? 'fatal' : entry.level,
    fingerprint: [entry.fingerprint],
    release: entry.release,
    tags: { channel: entry.channel, route: entry.route ?? 'unknown' },
    breadcrumbs: entry.breadcrumbs,
  });
});
```

The same shape works for LogRocket, Datadog, or your own collector. That indirection
is why no vendor SDK is a dependency today.

## Correlation

Every outbound request carries `X-Correlation-Id`. The same ID lands on the log
entry for a failure, so a frontend error joins to the backend's logs for the exact
request that produced it. Timing comes from the transaction opened alongside it.

## Admin console

`AdminErrorLog.tsx` is a shell: tab selection and badges, nothing else. Each tab
owns its filter state through `useErrorLog(channel)` and differs only in its
column list, so adding a channel is a new tab component plus one `<Tab>`.

```
AdminErrorLog.tsx          shell + tabs
├── useErrorLog.ts         one channel's slice, live-updated, filtered
├── ErrorLogToolbar.tsx    counts, search, level filter, grouping, export, clear
├── ErrorLogTable.tsx      shared table
├── errorLogColumns.tsx    column definitions + chip palettes
└── tabs/
    ├── ApiErrorsTab.tsx   endpoint, method, status, duration
    ├── AppErrorsTab.tsx   source, file, route (grouped by default)
    └── TestErrorsTab.tsx  reads public/test-report.json
```

Grouping collapses entries by fingerprint — the difference between "one bug" and
"one bug, 40 times". Export writes what is currently filtered, not the whole log.

## Unit-test channel

Test results exist only at build time, so this tab reads a file rather than the
live log:

1. `src/test/logReporter.ts` is registered in `vite.config.ts` alongside the
   default reporter.
2. Every run writes `public/test-report.json` (gitignored).
3. `TestErrorsTab` fetches it. A missing file is a normal "no run yet" state, not
   an error.

For CI, publish the same file with the build and the tab reflects the pipeline.

### Running the suite from the console

The **Run unit tests** button posts to `/__run-unit-tests`, a dev-server endpoint
added by `src/test/runTestsPlugin.ts`. It spawns `node_modules/.bin/vitest run`,
which rewrites the artifact through the reporter; the tab then refetches, which is
what advances the "run at" timestamp.

The plugin is `apply: 'serve'`, so the endpoint does not exist in a production
build — there is no Node process to host it, and shipping an HTTP endpoint that
executes a command would be indefensible. `canRunTests()` hides the button to
match. One run at a time: concurrent requests share a single in-flight promise so
two Vitest processes cannot race on the report file.

A failing suite is a _successful_ run of the endpoint — it returns HTTP 200 with a
non-zero `exitCode`, and the failures arrive in the report. Only a runner that
could not start at all is surfaced as an error.

## Adding a capture point

```ts
import { logError } from '@/utils/errorLogger';

logError({
  channel: 'app',
  error: 'SHORT_CODE',
  errorDescription: 'What a human needs to know',
  context: { kind: 'yourKind' },
});
```

Everything else — id, timestamp, fingerprint, session, release, route, severity,
breadcrumbs — is derived. Pass `fileName`/`lineNumber` explicitly when you know
them; the sniffed fallback degrades to a chunk name in production builds.
