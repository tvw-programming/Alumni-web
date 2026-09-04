/**
 * Durable, channel-aware error log.
 *
 * Storage strategy ("localStorage now, backend-ready"):
 *   1. Every entry is ALWAYS written to a rotating localStorage buffer, so the
 *      admin console works with no backend at all.
 *   2. The same entry is handed to `monitoring.report()`, whose sink is the
 *      console in dev, `VITE_ERROR_LOG_ENDPOINT` in production, or anything a
 *      host app installs via `setMonitoringSink`.
 *
 * This module owns persistence and enrichment only. It decides nothing about
 * *what* is an error — call sites and `normalizeError` do that — and it never
 * throws, because logging must not be the thing that breaks the app.
 */
import {
  classifySeverity,
  fingerprint,
  getBreadcrumbs,
  getRelease,
  getRoute,
  getSessionId,
  report,
} from './monitoring';

import type {
  ErrorLogChannel,
  ErrorLogEntry,
  ErrorLogFilter,
  ErrorLogInput,
  ErrorLogLevel,
} from './error-log.types';

const STORAGE_KEY = 'app.customErrorLog.v2';
const MAX_ENTRIES = 500;
/** Breadcrumbs are only attached to error/fatal entries — they are the expensive field. */
const BREADCRUMB_LEVELS: ReadonlySet<ErrorLogLevel> = new Set<ErrorLogLevel>(['error']);

type Listener = (entries: ErrorLogEntry[]) => void;
const listeners = new Set<Listener>();

/* ------------------------------------------------------------------ */
/* Source location capture                                             */
/* ------------------------------------------------------------------ */

/**
 * Best-effort `fileName` / `lineNumber` from the current stack.
 *
 * Reliable in dev (Vite serves real source maps). In a minified production
 * build it degrades to the bundle chunk name, which is why every logging call
 * site is free to pass `fileName` / `lineNumber` explicitly — an explicit value
 * always wins over the sniffed one.
 */
export function captureSource(depth = 3): { fileName: string; lineNumber: number | null } {
  const fallback = { fileName: 'unknown', lineNumber: null as number | null };
  try {
    const stack = new Error().stack;
    if (!stack) return fallback;

    const lines = stack.split('\n').filter((l) => l.includes('http'));
    const frame = lines[depth] ?? lines[lines.length - 1];
    if (!frame) return fallback;

    // Matches "... (http://host/assets/index-abc123.js:1234:56)" and bare forms.
    const match = /(?:\()?(https?:\/\/[^\s)]+):(\d+):(\d+)\)?/.exec(frame);
    if (!match) return fallback;

    const url = match[1].split('?')[0];
    const fileName = url.substring(url.lastIndexOf('/') + 1) || url;
    return { fileName, lineNumber: Number(match[2]) };
  } catch {
    return fallback;
  }
}

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/** Minimal shape check for one persisted log line. */
function isErrorLogEntry(value: unknown): value is ErrorLogEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<ErrorLogEntry>;
  return typeof entry.id === 'string' && typeof entry.dateTime === 'string';
}

function readRaw(): ErrorLogEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    // JSON.parse returns `any`; this buffer is user-writable storage, so the
    // shape is checked rather than trusted.
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is ErrorLogEntry => isErrorLogEntry(entry)).map(migrate);
  } catch {
    // Corrupt payload or storage disabled (private mode / quota).
    return [];
  }
}

/** Entries written before channels existed default to `app`, not to a crash. */
function migrate(entry: ErrorLogEntry): ErrorLogEntry {
  if (entry.channel && entry.severity) return entry;
  return {
    ...entry,
    channel: entry.channel ?? (entry.apiEndpoint ? 'api' : 'app'),
    severity: entry.severity ?? classifySeverity({ level: entry.level, status: entry.status }),
    fingerprint: entry.fingerprint ?? fingerprint([entry.error, entry.fileName]),
    sessionId: entry.sessionId ?? 'legacy',
    release: entry.release ?? 'legacy',
    status: entry.status ?? null,
    durationMs: entry.durationMs ?? null,
    correlationId: entry.correlationId ?? null,
    route: entry.route ?? null,
  };
}

function writeRaw(entries: ErrorLogEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // Quota exceeded — drop the oldest half and retry once so logging never
    // becomes the thing that breaks the app.
    try {
      const trimmed = entries.slice(0, Math.floor(entries.length / 2));
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
      /* give up silently */
    }
  }
}

function notify(entries: ErrorLogEntry[]): void {
  listeners.forEach((fn) => {
    try {
      fn(entries);
    } catch {
      /* a broken listener must not break logging */
    }
  });
}

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

/** Newest-first list of every entry. */
export function getLogs(): ErrorLogEntry[] {
  return readRaw();
}

/** Newest-first entries for one channel — what each admin tab renders. */
export function getLogsByChannel(channel: ErrorLogChannel): ErrorLogEntry[] {
  return readRaw().filter((entry) => entry.channel === channel);
}

/** Applies the admin console's filter set. Exported for direct testing. */
export function filterLogs(
  entries: readonly ErrorLogEntry[],
  filter: ErrorLogFilter,
): ErrorLogEntry[] {
  const search = filter.search?.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter.channel && entry.channel !== filter.channel) return false;
    if (filter.level && filter.level !== 'all' && entry.level !== filter.level) return false;
    if (!search) return true;
    return [entry.error, entry.errorDescription, entry.fileName, entry.apiEndpoint]
      .filter((field): field is string => typeof field === 'string')
      .some((field) => field.toLowerCase().includes(search));
  });
}

/**
 * Collapses entries sharing a fingerprint into one row plus an occurrence
 * count — the difference between "one bug" and "one bug, 40 times".
 */
export interface GroupedEntry {
  entry: ErrorLogEntry;
  count: number;
  firstSeen: string;
  lastSeen: string;
}

export function groupByFingerprint(entries: readonly ErrorLogEntry[]): GroupedEntry[] {
  const groups = new Map<string, GroupedEntry>();
  for (const entry of entries) {
    const existing = groups.get(entry.fingerprint);
    if (existing) {
      existing.count += 1;
      // Entries arrive newest-first, so anything later is older.
      existing.firstSeen = entry.dateTime;
    } else {
      groups.set(entry.fingerprint, {
        entry,
        count: 1,
        firstSeen: entry.dateTime,
        lastSeen: entry.dateTime,
      });
    }
  }
  return [...groups.values()];
}

export function countByLevel(entries: readonly ErrorLogEntry[]): Record<string, number> {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.level] = (acc[entry.level] ?? 0) + 1;
    return acc;
  }, {});
}

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

export function clearLogs(channel?: ErrorLogChannel): void {
  const next = channel ? readRaw().filter((entry) => entry.channel !== channel) : [];
  if (channel) {
    writeRaw(next);
  } else {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
  notify(next);
}

/** Subscribe to log changes. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/**
 * Append one entry. Never throws — logging failures must stay invisible to the
 * user-facing flow. Everything the call site did not supply is derived here, so
 * a call site passes only what it actually knows.
 */
export function logError(input: ErrorLogInput): ErrorLogEntry {
  const sniffed =
    input.fileName && input.lineNumber != null
      ? { fileName: input.fileName, lineNumber: input.lineNumber }
      : captureSource();

  const level = input.level ?? 'error';
  const channel = input.channel ?? 'app';
  const status = input.status ?? null;

  const entry: ErrorLogEntry = {
    id: makeId(),
    dateTime: input.dateTime ?? new Date().toISOString(),
    channel,
    level,
    severity:
      input.severity ?? classifySeverity({ level, status, kind: input.context?.['kind'] as string }),
    fingerprint:
      input.fingerprint ??
      fingerprint([channel, input.error, input.apiEndpoint, status, input.fileName]),
    fileName: input.fileName ?? sniffed.fileName,
    lineNumber: input.lineNumber ?? sniffed.lineNumber,
    apiEndpoint: input.apiEndpoint ?? null,
    httpMethod: input.httpMethod ?? null,
    status,
    durationMs: input.durationMs ?? null,
    correlationId: input.correlationId ?? null,
    sessionId: input.sessionId ?? getSessionId(),
    release: input.release ?? getRelease(),
    route: input.route ?? getRoute(),
    error: input.error,
    errorDescription: input.errorDescription,
    context: input.context,
    breadcrumbs: input.breadcrumbs ?? (BREADCRUMB_LEVELS.has(level) ? getBreadcrumbs() : undefined),
  };

  const next = [entry, ...readRaw()].slice(0, MAX_ENTRIES);
  writeRaw(next);
  notify(next);
  report(entry);

  return entry;
}

/** Convenience wrappers so call sites read cleanly. */
export const logWarning = (input: Omit<ErrorLogInput, 'level'>) =>
  logError({ ...input, level: 'warning' });

export const logInfo = (input: Omit<ErrorLogInput, 'level'>) =>
  logError({ ...input, level: 'info' });

export const logDebug = (input: Omit<ErrorLogInput, 'level'>) =>
  logError({ ...input, level: 'debug' });

/* ------------------------------------------------------------------ */
/* File export                                                         */
/* ------------------------------------------------------------------ */

/** Human-readable log-file rendering of one entry. */
export function formatEntryAsLogLine(e: ErrorLogEntry): string {
  return [
    `[${e.dateTime}] ${e.level.toUpperCase()} (${e.channel}/${e.severity}) #${e.fingerprint}`,
    `  file        : ${e.fileName}${e.lineNumber != null ? `:${String(e.lineNumber)}` : ''}`,
    `  route       : ${e.route ?? '-'}`,
    `  apiEndpoint : ${e.apiEndpoint ?? '-'}`,
    `  httpMethod  : ${e.httpMethod ?? '-'}`,
    `  status      : ${e.status != null ? String(e.status) : '-'}`,
    `  durationMs  : ${e.durationMs != null ? String(e.durationMs) : '-'}`,
    `  correlation : ${e.correlationId ?? '-'}`,
    `  session     : ${e.sessionId}  release: ${e.release}`,
    `  error       : ${e.error}`,
    `  description : ${e.errorDescription}`,
    e.context ? `  context     : ${JSON.stringify(e.context)}` : null,
    e.breadcrumbs?.length
      ? `  trail       : ${e.breadcrumbs.map((b) => `${b.category}:${b.message}`).join(' > ')}`
      : null,
  ]
    .filter((line): line is string => line !== null)
    .join('\n');
}

export function buildLogFile(entries: readonly ErrorLogEntry[], format: 'log' | 'json'): string {
  if (format === 'json') return JSON.stringify(entries, null, 2);
  const header =
    `# Custom Error Log\n` +
    `# generated : ${new Date().toISOString()}\n` +
    `# release   : ${getRelease()}\n` +
    `# entries   : ${String(entries.length)}\n` +
    `${'-'.repeat(72)}\n`;
  return header + entries.map(formatEntryAsLogLine).join(`\n${'-'.repeat(72)}\n`);
}

/** Triggers a real file download through the browser. */
export function downloadLogs(
  format: 'log' | 'json' = 'log',
  entries: readonly ErrorLogEntry[] = getLogs(),
): void {
  const contents = buildLogFile(entries, format);
  const blob = new Blob([contents], {
    type: format === 'json' ? 'application/json' : 'text/plain',
  });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().slice(0, 10);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `error-log-${stamp}.${format}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  // Release the blob on the next tick — revoking synchronously can cancel the
  // download in some browsers.
  setTimeout(() => { URL.revokeObjectURL(url); }, 0);
}
