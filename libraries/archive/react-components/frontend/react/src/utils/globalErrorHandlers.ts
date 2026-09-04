/**
 * Catches the app-channel failures that never reach a React boundary:
 * uncaught runtime errors, unhandled promise rejections, failed lazy-chunk
 * loads, `console.error` output, and connectivity changes.
 *
 * Installed once from `main.tsx`. Returns an uninstall function so tests can
 * set up and tear down without leaking handlers between cases.
 */
import { logError, logWarning } from './errorLogger';
import { addBreadcrumb, isReportingToConsole } from './monitoring';

export interface GlobalHandlerOptions {
  /**
   * Mirror `console.error` calls into the log. Off by default because it is
   * intrusive: it wraps a global. Worth enabling when you want React's own
   * warnings (key warnings, prop-type failures, act() violations) to show up in
   * the admin console alongside everything else.
   */
  captureConsoleErrors?: boolean;
}

/** A dynamic-import failure means the user is stuck on a stale deploy. */
function isChunkLoadError(message: string): boolean {
  return /failed to fetch dynamically imported module|loading chunk|importing a module script failed/i.test(
    message,
  );
}

function describe(value: unknown): { name: string; message: string; stack: string | null } {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack?.split('\n').slice(0, 5).join(' | ') ?? null,
    };
  }
  if (typeof value === 'string') return { name: 'Error', message: value, stack: null };
  try {
    return { name: 'Error', message: JSON.stringify(value) ?? 'Unknown', stack: null };
  } catch {
    return { name: 'Error', message: 'Unserializable value thrown', stack: null };
  }
}

export function installGlobalErrorHandlers(options: GlobalHandlerOptions = {}): () => void {
  const teardown: (() => void)[] = [];

  /* Uncaught runtime errors ---------------------------------------- */
  const onError = (event: ErrorEvent) => {
    const { name, message, stack } = describe(event.error ?? event.message);
    const chunk = isChunkLoadError(message);
    logError({
      channel: 'app',
      fileName: event.filename ? (event.filename.split('/').pop() ?? event.filename) : 'window',
      lineNumber: event.lineno || null,
      error: chunk ? 'CHUNK_LOAD_ERROR' : `UNCAUGHT_${name.toUpperCase()}`,
      errorDescription: chunk
        ? 'A code chunk failed to load. The deployed build may have changed — a reload usually fixes it.'
        : message,
      severity: chunk ? 'fatal' : 'error',
      context: { kind: chunk ? 'chunk' : 'uncaught', stack, column: event.colno },
    });
  };
  window.addEventListener('error', onError);
  teardown.push(() => window.removeEventListener('error', onError));

  /* Unhandled promise rejections ----------------------------------- */
  const onRejection = (event: PromiseRejectionEvent) => {
    const { name, message, stack } = describe(event.reason);
    logError({
      channel: 'app',
      fileName: 'window',
      error: `UNHANDLED_REJECTION_${name.toUpperCase()}`,
      errorDescription: message,
      context: { kind: 'rejection', stack },
    });
  };
  window.addEventListener('unhandledrejection', onRejection);
  teardown.push(() => window.removeEventListener('unhandledrejection', onRejection));

  /* Connectivity ---------------------------------------------------- */
  const onOffline = () => {
    addBreadcrumb('lifecycle', 'Browser went offline');
    logWarning({
      channel: 'app',
      fileName: 'window',
      error: 'OFFLINE',
      errorDescription:
        'The browser lost its network connection. Requests will fail until it returns.',
      context: { kind: 'network' },
    });
  };
  const onOnline = () => addBreadcrumb('lifecycle', 'Browser back online');
  window.addEventListener('offline', onOffline);
  window.addEventListener('online', onOnline);
  teardown.push(() => {
    window.removeEventListener('offline', onOffline);
    window.removeEventListener('online', onOnline);
  });

  /* console.error mirroring ---------------------------------------- */
  if (options.captureConsoleErrors) {
    const original = console.error;
    console.error = (...args: unknown[]) => {
      original(...args);
      // The dev sink writes through console.error itself; without this guard a
      // single logged error would recurse until the stack blew.
      if (isReportingToConsole()) return;
      try {
        const message = args
          .map((arg) => (arg instanceof Error ? arg.message : String(arg)))
          .join(' ')
          .slice(0, 500);
        logError({
          channel: 'app',
          fileName: 'console',
          error: 'CONSOLE_ERROR',
          errorDescription: message,
          severity: 'warning',
          context: { kind: 'console' },
        });
      } catch {
        /* never let logging break a console call */
      }
    };
    teardown.push(() => {
      console.error = original;
    });
  }

  return () => {
    teardown.forEach((fn) => {
      fn();
    });
  };
}
