import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

import { completeRequestTrace, logApiFailure, startRequestTrace } from '@/api/apiTelemetry';
import { getAccessToken } from '@/services/authService';
import { normalizeError } from '@/utils/errors';

export interface ApiClientOptions {
  baseURL: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
  /** Called on every request; return null to skip the Authorization header. */
  getAuthToken?: () => string | null;
  /** Refreshes an expired credential and returns the replacement token. */
  refreshAuthToken?: () => Promise<string | null>;
  /** Called when refresh cannot restore authentication. */
  onAuthFailure?: () => void;
}

export const PROJECT_HEADER = { key: 'projName', value: 'CGen' } as const;

/**
 * Factory so features needing a different base URL / headers reuse the same
 * interceptor behavior instead of duplicating axios setup.
 */
export function createApiClient(options: ApiClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL: options.baseURL,
    timeout: options.timeoutMs ?? 15_000,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    // Required correlation header for every request, including retries.
    config.headers.set(PROJECT_HEADER.key, PROJECT_HEADER.value);
    const token = options.getAuthToken?.() ?? null;
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`);
    }
    // Stamps a per-request correlation ID and starts the timing transaction
    // that `logApiFailure` reads back on the error path.
    return startRequestTrace(config);
  });

  const refreshedRequests = new WeakSet<object>();
  let refreshPromise: Promise<string | null> | null = null;

  client.interceptors.response.use(completeRequestTrace, async (error: unknown) => {
    if (
      axios.isAxiosError(error) &&
      error.response?.status === 401 &&
      error.config &&
      options.refreshAuthToken &&
      !refreshedRequests.has(error.config)
    ) {
      refreshedRequests.add(error.config);
      refreshPromise ??= options.refreshAuthToken().finally(() => {
        refreshPromise = null;
      });
      const token = await refreshPromise;
      if (token) {
        error.config.headers.set('Authorization', `Bearer ${token}`);
        return client.request(error.config);
      }
      options.onAuthFailure?.();
    }

    // One capture point for the whole `api` channel: a token refresh that
    // succeeded above already returned, so anything reaching here is a real
    // failure the caller will see.
    const appError = normalizeError(error);
    logApiFailure(error, appError);

    // AppError is intentionally a plain discriminated union.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    return Promise.reject(appError);
  });

  return client;
}

/** Default app client. Every error it rejects with is already an AppError. */
export const apiClient = createApiClient({
  baseURL: 'https://dummyjson.com',
  getAuthToken: getAccessToken,
});
