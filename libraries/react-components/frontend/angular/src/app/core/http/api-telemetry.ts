import { logError } from '../errors/error-logger';
import { getUserMessage } from '../errors/normalize-error';
import { addBreadcrumb, startTransaction, type Transaction } from '../errors/monitoring';

import type { AppError } from './api-error';
import type { HttpRequest } from '@angular/common/http';

/**
 * The single capture point for the `api` log channel.
 *
 * Ported from the React app's `api/apiTelemetry.ts`. The behaviour is
 * identical — a correlation ID and timing transaction per request, a breadcrumb
 * on success, one log entry per failure — but the plumbing differs: Angular's
 * `HttpRequest` is immutable, so a trace cannot be attached to it the way the
 * Axios config carried one. Traces are keyed by the request object in a
 * `WeakMap` instead, which is the same trick used for the Axios config and has
 * the same benefit: nothing is added to an object the framework owns, and
 * entries are collected with the request.
 */

export const CORRELATION_HEADER = 'X-Correlation-Id';

export interface RequestTrace {
  correlationId: string;
  transaction: Transaction;
}

const traces = new WeakMap<HttpRequest<unknown>, RequestTrace>();

/** Starts timing a request. The caller stamps the returned ID onto the headers. */
export function startRequestTrace(request: HttpRequest<unknown>): RequestTrace {
  const transaction = startTransaction(`${request.method} ${request.url}`);
  const trace = { correlationId: transaction.correlationId, transaction };
  traces.set(request, trace);
  return trace;
}

/** Closes the transaction on success and records a breadcrumb. */
export function completeRequestTrace(request: HttpRequest<unknown>, status: number): void {
  const trace = traces.get(request);
  const durationMs = trace?.transaction.finish('ok') ?? null;
  addBreadcrumb('http', `${request.method} ${request.url} → ${String(status)}`, {
    durationMs,
    correlationId: trace?.correlationId,
  });
}

/** Short machine code for the log's `error` column. */
function errorCode(appError: AppError, status: number | null): string {
  if (appError.kind === 'api' || appError.kind === 'auth') return `API_${String(status ?? 0)}`;
  return `API_${appError.kind.toUpperCase()}`;
}

/**
 * Records one failed request.
 *
 * Cancellations are deliberately skipped: an aborted request is normal
 * operation when a component is destroyed mid-flight, and logging them buries
 * the real failures.
 */
export function logApiFailure(request: HttpRequest<unknown>, appError: AppError): void {
  if (appError.kind === 'canceled') return;

  const trace = traces.get(request);
  const durationMs = trace?.transaction.finish('failed') ?? null;
  const status = 'status' in appError ? appError.status : null;

  addBreadcrumb('http', `${request.method} ${request.url} failed`, {
    status,
    correlationId: trace?.correlationId,
  });

  logError({
    channel: 'api',
    fileName: 'api-telemetry.ts',
    apiEndpoint: request.url,
    httpMethod: request.method,
    status,
    durationMs,
    correlationId: trace?.correlationId ?? null,
    error: errorCode(appError, status),
    errorDescription: getUserMessage(appError),
    context: {
      kind: appError.kind,
      // The raw server message, which `getUserMessage` may have replaced with
      // friendlier wording — the admin console needs the original.
      serverMessage: appError.message,
      ...(appError.kind === 'api' && appError.fieldErrors
        ? { fieldErrors: appError.fieldErrors }
        : {}),
      ...(appError.kind === 'api' && appError.code ? { code: appError.code } : {}),
    },
  });
}
