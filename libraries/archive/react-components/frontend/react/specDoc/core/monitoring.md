## Component Specification

### Name & Purpose

The error log and monitoring sink — a rotating client-side buffer of everything
that went wrong, plus the pluggable destination it is also sent to.

### Location

`src/utils/errorLogger.ts`, `src/utils/monitoring.ts`, `src/types/errorLog.ts`

### Public Interface

```ts
// errorLogger.ts
export function logError(input: ErrorLogInput): ErrorLogEntry;
export const logWarning: (input: Omit<ErrorLogInput,'level'>) => ErrorLogEntry;
export const logInfo:    (…) => ErrorLogEntry;
export const logDebug:   (…) => ErrorLogEntry;

export function getLogs(): ErrorLogEntry[];
export function getLogsByChannel(channel: ErrorLogChannel): ErrorLogEntry[];
export function filterLogs(entries, filter: ErrorLogFilter): ErrorLogEntry[];
export function groupByFingerprint(entries): GroupedEntry[];
export function countByLevel(entries): Record<string, number>;
export function clearLogs(channel?: ErrorLogChannel): void;
export function subscribe(fn: (entries: ErrorLogEntry[]) => void): () => void;
export function downloadLogs(format: 'log' | 'json', entries?): void;
export function captureSource(depth?: number): { fileName: string; lineNumber: number | null };

// monitoring.ts
export function setMonitoringSink(sink: (entry: ErrorLogEntry) => void): void;
export function addBreadcrumb(category: BreadcrumbCategory, message: string, data?): void;
export function getSessionId(): string;
export function getRelease(): string;
```

### Dependencies

- Internal: `utils/safeStorage`.
- External: none. Framework-free on purpose — the Angular app uses these files
  **verbatim**.

### Data Models

```ts
type ErrorLogChannel = 'api' | 'app' | 'test';
type ErrorLogLevel = 'error' | 'warning' | 'info' | 'debug';
type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

interface ErrorLogEntry {
  id: string;
  dateTime: string;
  channel: ErrorLogChannel;
  level: ErrorLogLevel;
  severity: ErrorSeverity;
  error: string;
  errorDescription: string;
  fileName: string;
  lineNumber: number | null;
  route: string | null;
  fingerprint: string;
  sessionId: string;
  release: string;
  apiEndpoint?: string;
  httpMethod?: string;
  status?: number | null;
  durationMs?: number | null;
  correlationId?: string | null;
  context?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
}
```

Storage key `app.customErrorLog.v2`, max **500** entries, newest first.

### Business Rules & Constraints

- **Logging never throws.** A logging failure must stay invisible to the
  user-facing flow — every storage call is wrapped.
- **Three channels, one buffer.** `api` is written only by `apiTelemetry`; `app`
  by every other capture point, tagged with `context.kind`; `test` by the Vitest
  reporter artifact (not this buffer).
- **`fingerprint` groups recurrences.** Derived from the error and its source, so
  the same failure 200 times is one row.
- **Entries written before channels existed are migrated on read**, not on write.
- **The sink is pluggable**; the default is the console in dev. Tests install a
  no-op so a logged error does not become test output.
- **`subscribe` is a callback API**, which is why Angular wraps it once in a
  signal store rather than each consumer subscribing.

### Extension Points

- **A new channel:** add to `ErrorLogChannel`, then a tab in the admin console.
- **A remote sink:** `setMonitoringSink(entry => post('/logs', entry))` at
  startup. Nothing else changes.
- **A new capture point:** call `logError({ channel: 'app', context: { kind: … } })`.
  Use `captureSource()` for file and line.
