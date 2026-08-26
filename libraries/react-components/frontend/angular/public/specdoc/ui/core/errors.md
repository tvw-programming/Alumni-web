## Component Specification

### Name & Purpose
`AppError`, its normaliser, the error logger and the monitoring sink. The
framework-free files are **byte-identical ports** of the React app's.

### Location
`src/app/core/errors/` — `normalize-error.ts`, `error-logger.ts`, `monitoring.ts`,
`error-log.types.ts`, `error-log-store.ts`

### Public Interface

```ts
export function normalizeError(error: unknown): AppError;
export function getUserMessage(error: AppError): string;

// error-logger.ts — identical to React's, tests included
export function logError(input: ErrorLogInput): ErrorLogEntry;
export const logWarning, logInfo, logDebug;
export function getLogs(), getLogsByChannel(channel), filterLogs(entries, filter);
export function groupByFingerprint(entries), countByLevel(entries);
export function clearLogs(channel?), subscribe(fn), downloadLogs(format, entries?);

// error-log-store.ts — the Angular-only bridge
@Injectable({ providedIn: 'root' })
export class ErrorLogStore {
  readonly entries: Signal<ErrorLogEntry[]>;
  readonly channelCounts: Signal<Record<string, number>>;
  refresh(): void;
  clearChannel(channel: ErrorLogChannel): void;
  forChannel(channel: ErrorLogChannel): ErrorLogEntry[];
}
```

### Dependencies
- Internal: `core/storage/safe-storage`, `core/config/app-config`.
- External: `@angular/common/http` (only for the `HttpErrorResponse` branch).

### Data Models
Identical to React's — see `frontend/react/specDoc/core/monitoring.md`. Same
storage key (`app.customErrorLog.v2`), same 500-entry cap, same three channels.

### Business Rules & Constraints

- **`AppError` is a plain object, not an `Error`.** `@typescript-eslint/only-throw-error`
  is **off** for this reason, documented in `eslint.config.js`. The trade is
  real: a thrown object carries no stack, so the logger records file and line at
  the capture point instead.
- **Axios branches became `HttpErrorResponse` branches**; everything else is the
  React file unchanged.
- **`ErrorLogStore` is the single place the callback `subscribe` becomes a
  signal.** React needed `useSyncExternalStore` in each consumer; one root
  service replaces all of them, and the subscription is established once for the
  app's life.
- **Status 0 is `network` unless the cause is an abort** → `canceled`, and
  cancelled requests are never logged.

### Extension Points

- **A new channel:** `ErrorLogChannel`, then a `<mat-tab>` in the console.
- **A remote sink:** `setMonitoringSink(...)` at startup.
- **A new capture point:** `logError({ channel: 'app', context: { kind: … } })`.
