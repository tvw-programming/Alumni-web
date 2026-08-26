/**
 * Monitoring primitives: session identity, correlation IDs, breadcrumbs,
 * transaction timing, fingerprinting and severity classification.
 *
 * This module deliberately owns no transport. It collects context and hands
 * finished entries to a *sink*. The default sink is console in dev and the
 * configured HTTP endpoint in production; `setMonitoringSink` swaps in anything
 * else without touching a single call site:
 *
 *   setMonitoringSink((entry) => Sentry.captureEvent(toSentryEvent(entry)));
 *
 * Nothing here may throw. Monitoring that breaks the app is worse than no
 * monitoring, so every public function is wrapped or trivially total.
 */
import { ERROR_LOG_ENDPOINT, IS_DEV, RELEASE } from '../config/app-config';
import { safeSessionStorage } from '../storage/safe-storage';

import type {
  Breadcrumb,
  BreadcrumbCategory,
  ErrorLogEntry,
  ErrorSeverity,
} from './error-log.types';

const SESSION_KEY = 'app.monitoring.sessionId';
const MAX_BREADCRUMBS = 25;

/** Optional remote sink. Unset by default — the local log is still written. */
const REMOTE_ENDPOINT: string | undefined = ERROR_LOG_ENDPOINT;



/* ------------------------------------------------------------------ */
/* Identity: session and release                                       */
/* ------------------------------------------------------------------ */

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

let cachedSessionId: string | null = null;

/**
 * Stable for the lifetime of the tab. Held in sessionStorage rather than memory
 * so a reload caused by the crash still groups with the entries that preceded
 * it, and rather than localStorage so two tabs are two sessions.
 */
export function getSessionId(): string {
  if (cachedSessionId !== null) return cachedSessionId;
  const stored = safeSessionStorage.get(SESSION_KEY);
  cachedSessionId = stored ?? randomId('s');
  if (stored === null) {
    try {
      safeSessionStorage.set(SESSION_KEY, cachedSessionId);
    } catch {
      /* private mode / quota — an in-memory id is still useful */
    }
  }
  return cachedSessionId;
}

/**
 * Build identifier, so an entry can be traced back to the deploy that produced
 * it. Read from `core/config/app-config`, which is the Angular equivalent of the
 * React app's Vite `define` — see that file to point it at a real deployment.
 */
export function getRelease(): string {
  return RELEASE;
}

/** Fresh per outbound request, sent as a header and echoed into the log entry. */
export function newCorrelationId(): string {
  return randomId('r');
}

/** Current route path, or null outside a browser. */
export function getRoute(): string | null {
  try {
    return window.location.pathname + window.location.search;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Breadcrumbs                                                         */
/* ------------------------------------------------------------------ */

const breadcrumbs: Breadcrumb[] = [];

/**
 * Record one step on the path to an error. The buffer is a fixed-size ring, so
 * this is safe to call on every navigation and every request.
 */
export function addBreadcrumb(
  category: BreadcrumbCategory,
  message: string,
  data?: Record<string, unknown>,
): void {
  try {
    breadcrumbs.push({ timestamp: new Date().toISOString(), category, message, data });
    if (breadcrumbs.length > MAX_BREADCRUMBS)
      breadcrumbs.splice(0, breadcrumbs.length - MAX_BREADCRUMBS);
  } catch {
    /* never break a caller for a breadcrumb */
  }
}

/** Oldest-first snapshot of the current buffer. */
export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

export function clearBreadcrumbs(): void {
  breadcrumbs.length = 0;
}

/* ------------------------------------------------------------------ */
/* Transaction timing                                                  */
/* ------------------------------------------------------------------ */

export interface Transaction {
  readonly name: string;
  readonly correlationId: string;
  /** Milliseconds elapsed so far, without ending the transaction. */
  elapsed: () => number;
  /** Ends the transaction, drops a breadcrumb, and returns the duration. */
  finish: (outcome?: 'ok' | 'failed') => number;
}

/**
 * Times one logical operation (a request, a route transition, a submit). The
 * returned correlation ID is what ties the timing to any error it produces.
 */
export function startTransaction(name: string, correlationId = newCorrelationId()): Transaction {
  const startedAt = performanceNow();
  let finished = false;

  return {
    name,
    correlationId,
    elapsed: () => Math.round(performanceNow() - startedAt),
    finish: (outcome = 'ok') => {
      const duration = Math.round(performanceNow() - startedAt);
      if (!finished) {
        finished = true;
        addBreadcrumb('http', `${name} ${outcome} in ${String(duration)}ms`, { correlationId });
      }
      return duration;
    },
  };
}

function performanceNow(): number {
  try {
    return performance.now();
  } catch {
    return Date.now();
  }
}

/* ------------------------------------------------------------------ */
/* Fingerprinting and severity                                         */
/* ------------------------------------------------------------------ */

/**
 * Stable 32-bit hash (FNV-1a) of the identity-defining parts of an error. Two
 * occurrences of the same fault produce the same fingerprint even though their
 * timestamps, correlation IDs and messages-with-embedded-values differ.
 */
export function fingerprint(parts: readonly (string | number | null | undefined)[]): string {
  const input = parts.filter((part) => part !== null && part !== undefined).join('|');
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Impact classification. Kept separate from `level` because the two answer
 * different questions — see the `ErrorSeverity` docs.
 */
export function classifySeverity(input: {
  kind?: string;
  status?: number | null;
  level?: string;
}): ErrorSeverity {
  const { kind, status, level } = input;
  if (kind === 'chunk' || kind === 'boundary') return 'fatal';
  if (status != null && status >= 500) return 'fatal';
  if (kind === 'network' || kind === 'timeout') return 'error';
  if (status != null && status >= 400) return 'warning';
  if (level === 'info' || level === 'debug') return 'info';
  if (level === 'warning') return 'warning';
  return 'error';
}

/* ------------------------------------------------------------------ */
/* Connectivity                                                        */
/* ------------------------------------------------------------------ */

export function isOnline(): boolean {
  try {
    return navigator.onLine;
  } catch {
    return true;
  }
}

/* ------------------------------------------------------------------ */
/* Sink                                                                */
/* ------------------------------------------------------------------ */

export type MonitoringSink = (entry: ErrorLogEntry) => void;

let sink: MonitoringSink = defaultSink;

/**
 * Replace the transport. Call once at startup, before rendering, so no entry is
 * dropped. Pass nothing to restore the default.
 */
export function setMonitoringSink(next?: MonitoringSink): void {
  sink = next ?? defaultSink;
}

/** Hands a finished entry to the active sink. Never throws. */
export function report(entry: ErrorLogEntry): void {
  try {
    sink(entry);
  } catch {
    /* a broken sink must not break logging */
  }
}

/**
 * Dev: a grouped, readable console record. Production: fire-and-forget POST to
 * `VITE_ERROR_LOG_ENDPOINT`, or nothing when that is unset.
 */
function defaultSink(entry: ErrorLogEntry): void {
  if (IS_DEV) {
    consoleReport(entry);
    return;
  }
  if (!REMOTE_ENDPOINT) return;
  try {
    // `keepalive` lets the request outlive a page unload.
    void fetch(REMOTE_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
      keepalive: true,
    }).catch(() => {
      /* the local log is the source of truth; ignore transport failures */
    });
  } catch {
    /* ignore */
  }
}

/** Set while the console sink is writing, so the console patch cannot recurse. */
let insideConsoleReport = false;

function consoleReport(entry: ErrorLogEntry): void {
  insideConsoleReport = true;
  try {
    const method = entry.level === 'error' ? 'error' : entry.level === 'warning' ? 'warn' : 'info';
    // Structured, one JSON object per entry — greppable and copy-pasteable.
     
    console[method](`[${entry.channel}] ${entry.error}`, {
      description: entry.errorDescription,
      severity: entry.severity,
      fingerprint: entry.fingerprint,
      route: entry.route,
      correlationId: entry.correlationId,
      ...(entry.apiEndpoint ? { endpoint: `${entry.httpMethod ?? ''} ${entry.apiEndpoint}` } : {}),
      ...(entry.status != null ? { status: entry.status } : {}),
      ...(entry.durationMs != null ? { durationMs: entry.durationMs } : {}),
      ...(entry.context ? { context: entry.context } : {}),
    });
  } catch {
    /* ignore */
  } finally {
    insideConsoleReport = false;
  }
}

export function isReportingToConsole(): boolean {
  return insideConsoleReport;
}
