/**
 * The single capture point for the `api` log channel.
 *
 * Every request gets a correlation ID (sent as a header so a backend can join
 * its logs to ours) and a timing transaction. Successful responses leave a
 * breadcrumb; failures become one log entry carrying endpoint, method, status,
 * duration, correlation ID and the normalized error kind.
 *
 * Logging lives here rather than in `axiosClient.ts` so the client stays about
 * transport, and rather than in React Query so retries and cancellations are
 * visible at the layer that actually knows about them.
 */
import axios, { type AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

import { isAppError, type AppError } from '@/types/api';
import { logError } from '@/utils/errorLogger';
import { getUserMessage } from '@/utils/errors';
import { addBreadcrumb, startTransaction, type Transaction } from '@/utils/monitoring';

export const CORRELATION_HEADER = 'X-Correlation-Id';

export interface RequestTrace {
  correlationId: string;
  transaction: Transaction;
}

/**
 * Request config → its trace. A WeakMap rather than a property on the config so
 * nothing is added to an object Axios owns and serializes, and so entries are
 * collected with the config itself.
 */
const traces = new WeakMap<object, RequestTrace>();

/** Starts timing a request and stamps its correlation header. */
export function startRequestTrace(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const method = (config.method ?? 'get').toUpperCase();
  const url = config.url ?? '(unknown)';
  const transaction = startTransaction(`${method} ${url}`);
  config.headers.set(CORRELATION_HEADER, transaction.correlationId);
  traces.set(config, { correlationId: transaction.correlationId, transaction });
  return config;
}

/** Closes the transaction on success and records a breadcrumb. */
export function completeRequestTrace(response: AxiosResponse): AxiosResponse {
  const trace = traces.get(response.config);
  const durationMs = trace?.transaction.finish('ok') ?? null;
  addBreadcrumb(
    'http',
    `${(response.config.method ?? 'get').toUpperCase()} ${response.config.url ?? ''} → ${String(response.status)}`,
    { durationMs, correlationId: trace?.correlationId },
  );
  return response;
}

/** Short machine code for the log's `error` column. */
function errorCode(appError: AppError, status: number | null): string {
  if (appError.kind === 'api' || appError.kind === 'auth') return `API_${String(status ?? 0)}`;
  return `API_${appError.kind.toUpperCase()}`;
}

/**
 * Records one failed request. Cancellations are deliberately skipped: React
 * Query aborts in-flight requests on unmount as normal operation, and logging
 * them buries the real failures.
 */
export function logApiFailure(error: unknown, appError: AppError): void {
  if (appError.kind === 'canceled') return;

  const axiosError = axios.isAxiosError(error) ? (error as AxiosError) : null;
  const config = axiosError?.config;
  const trace = config ? traces.get(config) : undefined;
  const durationMs = trace?.transaction.finish('failed') ?? null;
  const status = isAppError(appError) && 'status' in appError ? (appError.status ?? null) : null;
  const method = config?.method?.toUpperCase() ?? null;
  const endpoint = config?.url ?? null;

  addBreadcrumb('http', `${method ?? '?'} ${endpoint ?? '?'} failed`, {
    status,
    correlationId: trace?.correlationId,
  });

  logError({
    channel: 'api',
    fileName: 'apiTelemetry.ts',
    apiEndpoint: endpoint,
    httpMethod: method,
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
