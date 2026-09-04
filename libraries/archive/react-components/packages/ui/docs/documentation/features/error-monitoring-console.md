# Error and monitoring console

> Evidence-based. Claims are labelled **Implemented** / **Inferred** /
> **Recommended** / **Limitation** / **Needs product input**. Unlabelled claims
> are Implemented. See [../README.md](../README.md).

---

## 1. Overview

One durable log, three channels, one admin console.

| Channel    | Contains                                                                                                                             | Written by                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------- |
| **`api`**  | Every failed HTTP request                                                                                                            | `api/apiTelemetry.ts` — the only writer     |
| **`app`**  | Render crashes, route failures, uncaught errors, unhandled rejections, chunk-load failures, mirrored `console.error`, offline events | Boundaries + `utils/globalErrorHandlers.ts` |
| **`test`** | Unit-test failures                                                                                                                   | Read from a build-time artifact             |

Two properties make it useful rather than decorative:

1. **No request can fail without appearing.** API capture is in the Axios
   response interceptor, not sprinkled through call sites.
2. **Logging never breaks the app.** Every public function is wrapped; a broken
   sink, a broken listener and a corrupt storage payload are all tested.

### Business purpose

**Inferred** — the code does not state it, but the design is unambiguous: give an
operator one place to see what went wrong in a user's browser without a
screen-share, including in production where the console is not visible.

### Intended users

Authenticated users holding `diagnostics:read`. Destructive controls need
`diagnostics:manage`. Unlike the `Manage*` showcase pages, **this is a genuine
operational tool**, not a component demo.

---

## 2. Entry points

| Path                           | Component       | Guard                                            |
| ------------------------------ | --------------- | ------------------------------------------------ |
| `/admin/master-data/error-log` | `AdminErrorLog` | `ProtectedRoute requires={['diagnostics:read']}` |

Diagnostics expose request URLs, payload fragments and stack traces, so the route
carries its own capability rather than riding on "is signed in".

### Modules

| Module                         | Role                                                             |
| ------------------------------ | ---------------------------------------------------------------- |
| `types/errorLog.ts`            | The log model                                                    |
| `types/testReport.ts`          | Contract for the Vitest artifact                                 |
| `utils/errorLogger.ts`         | Persistence + enrichment                                         |
| `utils/monitoring.ts`          | Session, correlation, breadcrumbs, timing, fingerprint, **sink** |
| `utils/globalErrorHandlers.ts` | Process-level capture                                            |
| `api/apiTelemetry.ts`          | The API channel's only writer                                    |
| `components/errors/*`          | Boundaries, route view, console shell, tabs                      |
| `test/logReporter.ts`          | Vitest reporter → `public/test-report.json`                      |
| `test/runTestsPlugin.ts`       | Dev-only endpoint to run the suite                               |

---

## 3. User flows

### Primary — investigate a failure

1. Operator opens the console; it lands on **API calls**.
2. Badges show per-channel counts.
3. Filter by level or search across message, file and endpoint.
4. Read endpoint, method, status, duration, correlation ID.
5. Export the filtered set as `.log` or `.json`.

### Primary — see repeated faults as one

Toggle **Group**: entries collapse by fingerprint with a `×N` count. That is the
difference between "one bug" and "one bug, 40 times". The Application tab groups
by default.

### Primary — check the test suite

Open **Unit tests**. The tab reads `public/test-report.json` and shows totals,
per-failure file, suite, assertion message, diff and stack. With
`diagnostics:manage` in a dev environment, **Run unit tests** executes the suite
and refreshes the report.

### Alternate — clear one channel

**Clear API** removes that channel only. Requires `diagnostics:manage`.

### Failure — no test report yet

A missing artifact is a normal state, not an error: the tab explains how to
generate one. The fetch resolves `null` rather than throwing, keeping it out of
the global error toast.

---

## 4. Architecture

```
                       ┌──────────────── capture ────────────────┐
axios interceptor  →  apiTelemetry.logApiFailure     (channel: api)
AppErrorBoundary   →  logError                       (channel: app, severity fatal)
RouteErrorView     →  logError / logWarning          (channel: app)
window handlers    →  logError / logWarning          (channel: app)
FormErrorLogger    →  logError                       (channel: app)
                       └────────────────┬────────────────────────┘
                                        ▼
                            utils/errorLogger.ts
                       enrich → persist → notify → report
                          │                          │
                          ▼                          ▼
              localStorage (rotating 500)     monitoring.report()
                          │                          │
                          ▼                     sink: console (dev)
                 subscribe() listeners          | endpoint (prod)
                          │                     | setMonitoringSink(fn)
                          ▼
                   AdminErrorLog tabs

Vitest run → logReporter → public/test-report.json → TestErrorsTab
```

### Responsibility boundaries

| Concern                                           | Owner                            |
| ------------------------------------------------- | -------------------------------- |
| What counts as a failure                          | Call sites + `normalizeError`    |
| Enrichment (fingerprint, session, release, route) | `errorLogger`                    |
| Persistence and rotation                          | `errorLogger`                    |
| Where entries are shipped                         | `monitoring`'s sink              |
| Context (breadcrumbs, correlation, timing)        | `monitoring`                     |
| Which entries a tab shows                         | `useErrorLog(channel)`           |
| Column layout                                     | `errorLogColumns.tsx` + each tab |

---

## 5. The log model

```ts
export interface ErrorLogEntry {
  id: string;
  dateTime: string; // ISO-8601
  channel: 'api' | 'app' | 'test';
  level: 'error' | 'warning' | 'info' | 'debug';
  severity: 'fatal' | 'error' | 'warning' | 'info';
  fingerprint: string; // stable hash → grouping
  fileName: string;
  lineNumber: number | null;
  apiEndpoint: string | null;
  httpMethod: string | null;
  status: number | null;
  durationMs: number | null;
  correlationId: string | null;
  sessionId: string;
  release: string;
  route: string | null;
  error: string; // short code, e.g. API_500
  errorDescription: string; // human-readable
  context?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
}
```

### `level` vs `severity`

Two fields because they answer different questions:

> `level` says how loudly to report; `severity` says how much it matters.

A 404 is `warning`/`warning`. A failed chunk load is `level: 'error'` but
`severity: 'fatal'`, because the user is stuck. A render crash is `fatal` even
when its kind looks mundane — the user has no working screen.

`classifySeverity` decides:

| Input                           | Severity  |
| ------------------------------- | --------- |
| `kind: 'chunk'` or `'boundary'` | `fatal`   |
| status ≥ 500                    | `fatal`   |
| `kind: 'network'` / `'timeout'` | `error`   |
| status ≥ 400                    | `warning` |
| level `info`/`debug`            | `info`    |
| level `warning`                 | `warning` |
| otherwise                       | `error`   |

### What a call site supplies

```ts
export type ErrorLogInput = Partial<Omit<ErrorLogEntry, 'error' | 'errorDescription'>> & {
  error: string;
  errorDescription: string;
};
```

Everything derivable — id, timestamp, fingerprint, session, release, route,
severity, breadcrumbs — is optional. A call site passes only what it knows.

---

## 6. Channels in detail

### `api`

Written **only** by `logApiFailure`, called from the Axios response interceptor.
Each entry carries endpoint, method, status, duration, correlation ID, the
normalised `kind`, and the **raw server message** in `context.serverMessage` —
because `getUserMessage` may have replaced it with friendlier wording and the
operator needs the original.

**Cancellations are skipped deliberately:**

```ts
if (appError.kind === 'canceled') return;
```

React Query aborts in-flight requests on unmount as normal operation; logging
them buries real failures.

### `app`

| Source               | Code                    | Notes                                              |
| -------------------- | ----------------------- | -------------------------------------------------- |
| Render crash         | `BOUNDARY_*`            | `severity: 'fatal'`; component stack in context    |
| Route/loader failure | `ROUTE_ERROR`           |                                                    |
| 404                  | `ROUTE_404`             | `warning` — expected navigation noise, not a fault |
| Uncaught error       | `UNCAUGHT_*`            |                                                    |
| Chunk load failure   | `CHUNK_LOAD_ERROR`      | `fatal`; usually a stale deploy                    |
| Unhandled rejection  | `UNHANDLED_REJECTION_*` |                                                    |
| Offline              | `OFFLINE`               | `warning`                                          |
| `console.error`      | `CONSOLE_ERROR`         | Dev-only mirroring                                 |
| Form validation      | via `FormErrorLogger`   |                                                    |
| Denied route         | `ACCESS_DENIED`         | From `ForbiddenPage`                               |

Console mirroring is **dev-only** by construction: in production it would log the
browser's own noise (extensions, blocked resources) as app errors. It also guards
against recursion — the dev sink writes _through_ `console.error`, so without
`isReportingToConsole()` a single logged error would recurse until the stack blew.

### `test`

Test results exist only at build time, so this channel reads a file:

1. `src/test/logReporter.ts` is registered in `vite.config.ts` beside the default
   reporter.
2. Every run writes `public/test-report.json` (gitignored).
3. `TestErrorsTab` fetches it.

The reporter captures file, suite chain, test name, error name, message, an
expected/actual diff and the first stack frames. **Verified** against a
deliberately failing test.

---

## 7. Monitoring

`utils/monitoring.ts` deliberately owns **no transport**. It collects context and
hands finished entries to a sink.

| Capability     | Detail                                                                                  |
| -------------- | --------------------------------------------------------------------------------------- |
| Session ID     | Per tab, in **sessionStorage** — survives a crash reload, but two tabs are two sessions |
| Release        | `__APP_VERSION__` inlined by Vite, `-dev` suffix in development                         |
| Correlation ID | Fresh per request, sent as `X-Correlation-Id`                                           |
| Breadcrumbs    | 25-entry ring; navigation, HTTP, UI, console, lifecycle                                 |
| Transactions   | `startTransaction(name)` → `elapsed()` / `finish(outcome)`                              |
| Fingerprint    | FNV-1a over identity-defining fields                                                    |
| Severity       | `classifySeverity`                                                                      |
| Connectivity   | `isOnline()`                                                                            |

### The sink

```ts
export function setMonitoringSink(next?: MonitoringSink): void;
```

Default: console in dev, `VITE_ERROR_LOG_ENDPOINT` in production (fire-and-forget
`fetch` with `keepalive` so it survives page unload), nothing if unset.

To ship to a vendor, install a sink once at startup — **no call site changes**:

```ts
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

That indirection is why no vendor SDK is a dependency.

### Fingerprinting

FNV-1a over `[channel, error, apiEndpoint, status, fileName]`. Two occurrences of
one fault hash identically even though their timestamps, correlation IDs and
embedded values differ. Absent fields do not shift the hash of present ones —
asserted by a test.

---

## 8. The console UI

```
AdminErrorLog.tsx          shell: tab selection + badges only
├── useErrorLog.ts         one channel's slice, live, filtered, grouped
├── ErrorLogToolbar.tsx    counts, search, level filter, Group, export, Clear
├── ErrorLogTable.tsx      shared table
├── errorLogColumns.tsx    column defs + chip palettes
├── Mono.tsx               monospace cell
└── tabs/
    ├── ApiErrorsTab.tsx   method, endpoint, status, duration
    ├── AppErrorsTab.tsx   source, file, route (grouped by default)
    └── TestErrorsTab.tsx  reads the artifact
```

The shell owns **only** tab selection and badges. Each tab owns its filter state
and differs only in its column list, so adding a channel is a new tab component
plus one `<Tab>`.

Tabs are mounted one at a time: each subscribes to the log and fetches, and
keeping all three alive would pay for all three.

### Permission gating

| Control                 | Capability                 |
| ----------------------- | -------------------------- |
| Viewing any tab         | `diagnostics:read` (route) |
| Export `.log` / `.json` | — (exporting is reading)   |
| **Clear channel**       | `diagnostics:manage`       |
| **Run unit tests**      | `diagnostics:manage`       |

Export writes what is **currently filtered**, not the whole log — the export
should match what the operator is looking at.

---

## 9. Running the suite from the console

The browser cannot spawn a process, so `src/test/runTestsPlugin.ts` adds
`POST /__run-unit-tests` to the **dev server**. It spawns
`node_modules/.bin/vitest run` (resolved locally, so it does not depend on a
package manager being on PATH), which rewrites the artifact through the reporter;
the tab then invalidates its query and refetches.

| Property            | Behaviour                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------- |
| Production build    | Endpoint **does not exist** (`apply: 'serve'`); the button is absent                        |
| Concurrency         | One run at a time; concurrent POSTs share one in-flight promise                             |
| Failing suite       | **HTTP 200** with non-zero `exitCode` — failures belong in the report, not in an HTTP error |
| Runner cannot start | Reported separately as an error                                                             |

**Verified end to end** against a running dev server: a passing run
(`exitCode 0`, 18 files / 166 tests at the time), an updated `generatedAt` in
both the file and the HTTP-served copy, byte-identical responses for two
simultaneous POSTs, and a deliberately failing test producing `exitCode 1` with
`status: failed` in the report.

An HTTP endpoint that executes a shell command has no business shipping, hence
the `apply: 'serve'` gate and the matching `canRunTests()` check in the UI.

---

## 10. Accessibility and responsive behaviour

**Implemented**

- Tabs use MUI `Tabs`/`Tab` — arrow-key navigation and `tab`/`tabpanel` roles.
- The log table is a real `<table>` with `<thead>`/`<th>`, so `table`,
  `columnheader` and `row` roles come free; tests query by `role="table"`.
- Level and severity are **chips with text labels**, not colour alone.
- Empty states are sentences that say what to do, not blank tables.
- The Unit tests tab uses `Alert` + `AlertTitle` for outcomes, which announce.
- Toolbar controls are labelled MUI inputs.

**Limitation.** Grouping shows `×N` in a `Tooltip` carrying the fingerprint.
Tooltip content is not reliably announced, so the fingerprint is effectively
sighted-only.
**Recommended:** put the fingerprint in the chip's `aria-label`.

**Limitation.** No `aria-live` region announces new entries while the console is
open.

**Responsive.** The toolbar wraps (`flexWrap` + `useFlexGap`); the table scrolls
inside `TableContainer` with `maxHeight: '60vh'` and a sticky header. **The table
does not collapse to cards on narrow screens** — it scrolls horizontally.

---

## 11. Best-practice justification

| Practice                             | Code evidence                                           | Justification                                                                         | Trade-off                                                              |
| ------------------------------------ | ------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| **One capture point per channel**    | `logApiFailure` (`apiTelemetry.ts:67`)                  | No request can fail unlogged; there is one place to change API logging.               | All API entries look alike; a call site cannot add bespoke context.    |
| **Skip cancellations**               | `apiTelemetry.ts:68`                                    | Unmount aborts are normal; logging them buries real failures.                         | A genuinely lost request that presents as a cancellation is invisible. |
| **Logging never throws**             | try/catch in listeners, sink, storage; tested           | The log must not become the outage.                                                   | Failures inside logging are silent by design.                          |
| **`level` separate from `severity`** | `types/errorLog.ts`                                     | "How loud" and "how bad" genuinely differ — a 404 is noisy but harmless.              | Two fields to set correctly.                                           |
| **Fingerprint grouping**             | `monitoring.ts:174`                                     | Collapses one recurring fault into one row with a count.                              | A hash collision would merge two faults.                               |
| **Transport-agnostic sink**          | `setMonitoringSink`                                     | Sentry/LogRocket/custom is ~15 lines and zero call-site changes; no vendor SDK today. | An adapter must be written to gain vendor features.                    |
| **Correlation IDs**                  | `X-Correlation-Id` + entry field                        | A frontend error joins to backend logs for that exact request.                        | Only pays off once the backend records it.                             |
| **Breadcrumbs bounded**              | 25-entry ring (`monitoring.ts:25`)                      | Answers "what did they do first?" without unbounded memory.                           | Long sessions lose early context.                                      |
| **Session in sessionStorage**        | `monitoring.ts:47`                                      | Survives a crash reload; two tabs are two sessions.                                   | A deliberate reload keeps the same session.                            |
| **Rotating buffer, quota-safe**      | `MAX_ENTRIES = 500`; on quota error drop half and retry | Logging cannot fill storage and break the app.                                        | Oldest entries are lost.                                               |
| **Migration on read**                | `migrate()` in `errorLogger.ts`                         | Entries written before channels existed still render.                                 | Migration code accumulates.                                            |
| **Shell owns only tabs**             | `AdminErrorLog.tsx`                                     | Adding a channel is a tab component plus a `<Tab>`.                                   | Tab state is not in the URL — see limitations.                         |
| **One tab mounted at a time**        | `{tab === 'api' && <ApiErrorsTab />}`                   | Only one subscription and one fetch are alive.                                        | Switching tabs re-mounts and re-filters.                               |
| **Export follows the filter**        | `downloadLogs(format, filtered)`                        | The export matches what is on screen.                                                 | No one-click "export everything".                                      |
| **Dev-only endpoint**                | `apply: 'serve'` (`runTestsPlugin.ts:46`)               | A command-executing endpoint cannot reach production.                                 | The button is unavailable in staging builds too.                       |
| **Failing suite is HTTP 200**        | `runTestsPlugin.ts`                                     | A failing suite is a _successful_ run of the endpoint.                                | Callers must read `exitCode`, not just the status.                     |
| **Capability-gated destruction**     | `usePermission('diagnostics:manage')`                   | Reading diagnostics and wiping them are different privileges.                         | Client-side only (see limitations).                                    |

---

## 12. Testing

| File                                       | Tests | Covers                                                                                                                                                                                                                                             |
| ------------------------------------------ | ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `utils/errorLogger.test.ts`                | 11    | Derivation from minimal input; channel separation; per-channel clear; severity from status; fingerprint grouping; filters; subscribe/unsubscribe; sink delivery; **broken sink and listener survive**; **corrupt payload ignored**; export formats |
| `utils/monitoring.test.ts`                 | 7     | Fingerprint stability and absent-field behaviour; severity matrix; bounded ordered breadcrumbs; transaction timing + breadcrumb; unique correlation IDs; stable session; sink routing and throwing sink                                            |
| `components/errors/AdminErrorLog.test.tsx` | 9     | Opens on API; channel isolation per tab; per-channel clear; level filter; no-report state; **run-and-refresh updates the timestamp**; runner failure surfaced; failures rendered; **`user` role sees no destructive controls**                     |
| `api/apiTelemetry.test.ts`                 | 4     | Correlation header; one entry per failure; success logs nothing; cancellations skipped                                                                                                                                                             |

**31 tests.**

```bash
cd frontend/react
pnpm exec vitest run src/utils/errorLogger.test.ts src/utils/monitoring.test.ts \
  src/components/errors src/api/apiTelemetry.test.ts
```

Test setup installs a no-op sink globally, because the dev sink writes to the
console and would otherwise print every logged error as test output.

**Limitation.** `globalErrorHandlers.ts` is **untested** — `window.onerror`,
unhandled rejections, chunk-load detection, offline and console mirroring.
**Recommended:** dispatch synthetic `error` / `unhandledrejection` events and
assert the resulting entries; the recursion guard in particular deserves a test.

**Limitation.** `logReporter.ts` has no unit test; it was verified manually.

---

## 13. Limitations and trade-offs

| #   | Limitation                                                                                                                                                                                                  |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Storage is per browser.** A user's log is invisible to support unless `VITE_ERROR_LOG_ENDPOINT` is configured — and no backend implements it.                                                             |
| 2   | **500-entry cap.** A noisy session evicts earlier entries.                                                                                                                                                  |
| 3   | **`globalErrorHandlers` untested** (§12).                                                                                                                                                                   |
| 4   | **Console mirroring wraps a global.** Dev-only and recursion-guarded, but still a global mutation.                                                                                                          |
| 5   | **The test channel is not live.** It reflects the last run, not the current state.                                                                                                                          |
| 6   | **`public/test-report.json` is world-readable** when deployed — it exposes test names and assertion messages. Gitignored, but a build could publish it. **Recommended:** exclude it from production builds. |
| 7   | **No PII scrubbing.** `context.serverMessage`, field errors and breadcrumbs are stored verbatim; a sink shipping them offsite could export personal data.                                                   |
| 8   | **Tab state is not in the URL**, so a specific tab cannot be linked.                                                                                                                                        |
| 9   | **No date-range filter** and no sorting beyond newest-first.                                                                                                                                                |
| 10  | **Grouping keeps the newest entry** as the representative row; `firstSeen`/`lastSeen` are computed but not displayed.                                                                                       |
| 11  | **Permission gating is client-side.** Hidden controls are not disabled endpoints.                                                                                                                           |
| 12  | **The run-tests endpoint has no auth**, relying entirely on being dev-only.                                                                                                                                 |

---

## 14. Extension guide

### Log from a new place

```ts
import { logError } from '@/utils/errorLogger';

logError({
  channel: 'app',
  error: 'SHORT_CODE',
  errorDescription: 'What a human needs to know',
  context: { kind: 'yourKind' },
});
```

Everything else is derived. Pass `fileName`/`lineNumber` when you know them — the
sniffed fallback degrades to a chunk name in production builds.

### Add a channel

1. Extend `ErrorLogChannel` in `types/errorLog.ts`.
2. Write a tab component using `useErrorLog('yourChannel')`.
3. Add one `<Tab>` in `AdminErrorLog.tsx`.

Nothing else changes shape.

### Ship to a vendor

One `setMonitoringSink` call at startup (§7). No call-site changes.

### Add a column

Add an `ErrorLogColumn` to the tab's array. Use `<Mono>` for machine-generated
values so columns stay aligned.

### Enable the remote sink

Set `VITE_ERROR_LOG_ENDPOINT`. Entries POST fire-and-forget with `keepalive`.
Consider limitation 7 first.

---

## 15. Evidence index

| Claim                                 | File                                                    | Line   |
| ------------------------------------- | ------------------------------------------------------- | ------ |
| Log model                             | `frontend/react/src/types/errorLog.ts`                        | 37     |
| Channels                              | `frontend/react/src/types/errorLog.ts`                        | 17     |
| `level` vs `severity` docs            | `frontend/react/src/types/errorLog.ts`                        | 15, 25 |
| `ErrorLogInput`                       | `frontend/react/src/types/errorLog.ts`                        | 79     |
| Test report contract                  | `frontend/react/src/types/testReport.ts`                      | 10, 28 |
| Enrichment + persistence (`logError`) | `frontend/react/src/utils/errorLogger.ts`                     | 246    |
| Rotating buffer                       | `frontend/react/src/utils/errorLogger.ts`                     | 34     |
| Quota fallback                        | `frontend/react/src/utils/errorLogger.ts`                     | 118    |
| Migration on read                     | `frontend/react/src/utils/errorLogger.ts`                     | 102    |
| Grouping                              | `frontend/react/src/utils/errorLogger.ts`                     | 188    |
| Filters                               | `frontend/react/src/utils/errorLogger.ts`                     | 162    |
| Export builder                        | `frontend/react/src/utils/errorLogger.ts`                     | 293    |
| Sink contract                         | `frontend/react/src/utils/monitoring.ts`                      | 219    |
| `setMonitoringSink`                   | `frontend/react/src/utils/monitoring.ts`                      | 227    |
| Fingerprint                           | `frontend/react/src/utils/monitoring.ts`                      | 174    |
| Severity classification               | `frontend/react/src/utils/monitoring.ts`                      | 188    |
| Breadcrumb ring                       | `frontend/react/src/utils/monitoring.ts`                      | 25, 98 |
| Session in sessionStorage             | `frontend/react/src/utils/monitoring.ts`                      | 47     |
| Transactions                          | `frontend/react/src/utils/monitoring.ts`                      | 138    |
| Global handlers                       | `frontend/react/src/utils/globalErrorHandlers.ts`             | 45     |
| Recursion guard                       | `frontend/react/src/utils/globalErrorHandlers.ts`             | 104    |
| API capture point                     | `frontend/react/src/api/apiTelemetry.ts`                      | 67     |
| Cancellations skipped                 | `frontend/react/src/api/apiTelemetry.ts`                      | 68     |
| Console shell                         | `frontend/react/src/components/errors/AdminErrorLog.tsx`      | 31     |
| Channel hook                          | `frontend/react/src/components/errors/useErrorLog.ts`         | 38     |
| Toolbar gating                        | `frontend/react/src/components/errors/ErrorLogToolbar.tsx`    | 60     |
| Run-tests gating                      | `frontend/react/src/components/errors/tabs/TestErrorsTab.tsx` | 114    |
| Vitest reporter                       | `frontend/react/src/test/logReporter.ts`                      | 69     |
| Dev-only endpoint                     | `frontend/react/src/test/runTestsPlugin.ts`                   | 46     |
| Concurrency guard                     | `frontend/react/src/test/runTestsPlugin.ts`                   | 42     |
| Logger tests                          | `frontend/react/src/utils/errorLogger.test.ts`                | —      |
| Monitoring tests                      | `frontend/react/src/utils/monitoring.test.ts`                 | —      |
| Console tests                         | `frontend/react/src/components/errors/AdminErrorLog.test.tsx` | —      |
