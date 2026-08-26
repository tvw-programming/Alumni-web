/**
 * The one log model every layer writes into.
 *
 * Three channels share the shape so the admin console can render them with one
 * table and one export path:
 *   - `api`  — a request failed (captured centrally in the Axios interceptor)
 *   - `app`  — anything else the running app produced: render crashes, route
 *              failures, `window.onerror`, unhandled rejections, `console.error`
 *   - `test` — unit-test failures, imported from the Vitest report artifact
 *
 * Channel-specific detail lives in `context` rather than in extra columns, so
 * adding a channel never means changing this interface.
 */

export type ErrorLogLevel = 'error' | 'warning' | 'info' | 'debug';

export type ErrorLogChannel = 'api' | 'app' | 'test';

/**
 * Impact classification, independent of `level`. `level` says how loudly to
 * report; `severity` says how much it matters. A 404 is `level: 'warning'` and
 * `severity: 'warning'`; a chunk-load failure is `level: 'error'` but
 * `severity: 'fatal'` because the user is stuck.
 */
export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export type BreadcrumbCategory = 'navigation' | 'http' | 'ui' | 'console' | 'lifecycle';

/** One user/system action recorded before an error, for reconstructing the path into it. */
export interface Breadcrumb {
  timestamp: string;
  category: BreadcrumbCategory;
  message: string;
  data?: Record<string, unknown>;
}

export interface ErrorLogEntry {
  id: string;
  /** ISO-8601. */
  dateTime: string;
  channel: ErrorLogChannel;
  level: ErrorLogLevel;
  severity: ErrorSeverity;
  /**
   * Stable hash of the identity-defining fields. Two occurrences of the same
   * fault share a fingerprint, which is what the console groups by and what a
   * remote sink would use to deduplicate.
   */
  fingerprint: string;
  fileName: string;
  lineNumber: number | null;
  apiEndpoint: string | null;
  httpMethod: string | null;
  /** HTTP status for `api` entries; null elsewhere. */
  status: number | null;
  /** Wall-clock duration of the failed operation, when measurable. */
  durationMs: number | null;
  /** Ties a log entry to the request that produced it (sent as a request header). */
  correlationId: string | null;
  /** Groups every entry from one browser tab session. */
  sessionId: string;
  /** Build identifier, so an entry can be traced to the deploy that produced it. */
  release: string;
  /** Route path at the time of capture. */
  route: string | null;
  /** Short machine-ish code, e.g. `API_500`, `BOUNDARY_UNKNOWN`, `TEST_FAILED`. */
  error: string;
  /** Human-readable detail. */
  errorDescription: string;
  context?: Record<string, unknown>;
  breadcrumbs?: Breadcrumb[];
}

/**
 * What a call site supplies. Everything the logger can derive — id, timestamp,
 * fingerprint, session, release, route, severity — is optional, so a call site
 * passes only what it actually knows.
 */
export type ErrorLogInput = Partial<Omit<ErrorLogEntry, 'error' | 'errorDescription'>> & {
  error: string;
  errorDescription: string;
};

/** Filter applied by the admin console; every field is optional and ANDed. */
export interface ErrorLogFilter {
  channel?: ErrorLogChannel;
  level?: ErrorLogLevel | 'all';
  search?: string;
}
