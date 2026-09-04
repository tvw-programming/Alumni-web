import { HttpErrorResponse } from '@angular/common/http';

import { isAppError, type AppError } from '../http/api-error';

/**
 * Normalize anything thrown anywhere in the app into a typed AppError.
 *
 * Ported from the React app's `utils/errors.ts`. The branch order and the
 * resulting `AppError` shapes are identical; only the transport detection
 * changed — Axios's `isAxiosError` / `isCancel` become `HttpErrorResponse` and
 * its `status === 0` case, which is how Angular reports a network failure or an
 * aborted request.
 */

interface ServerErrorBody {
  message?: string;
  error?: string;
  code?: string;
  errors?: Record<string, string>;
}

export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (error instanceof HttpErrorResponse) {
    // Angular reports "no response" as status 0 — offline, DNS failure, CORS
    // rejection, or a request aborted by an AbortSignal. Axios distinguished
    // cancel from network; Angular does not, so an explicitly aborted request
    // is detected from the underlying error instead.
    if (error.status === 0) {
      const cause: unknown = error.error;
      if (cause instanceof DOMException && cause.name === 'AbortError') {
        return { kind: 'canceled', message: 'Request was canceled' };
      }
      if (cause instanceof ProgressEvent || cause instanceof Error) {
        return { kind: 'network', message: 'Network error — check your connection' };
      }
      return { kind: 'network', message: 'Network error — check your connection' };
    }

    if (error.status === 408 || error.status === 504) {
      return { kind: 'timeout', message: 'The request timed out' };
    }

    const body = (error.error ?? {}) as ServerErrorBody;
    const message = body.message ?? body.error ?? error.message;

    if (error.status === 401 || error.status === 403) {
      return { kind: 'auth', message, status: error.status };
    }

    return {
      kind: 'api',
      message,
      status: error.status,
      code: body.code,
      fieldErrors: body.errors,
    };
  }

  if (error instanceof DOMException && error.name === 'AbortError') {
    return { kind: 'canceled', message: 'Request was aborted' };
  }

  if (error instanceof Error) {
    return { kind: 'unknown', message: error.message, cause: error };
  }

  return { kind: 'unknown', message: 'An unexpected error occurred', cause: error };
}

/**
 * User-facing message per error kind.
 *
 * Copied unchanged from the React app: this is the single place wording is
 * decided, and both apps should say the same thing for the same failure.
 */
export function getUserMessage(error: AppError): string {
  switch (error.kind) {
    case 'network':
      return 'Cannot reach the server. Please check your connection.';
    case 'timeout':
      return 'The server took too long to respond. Please try again.';
    case 'auth':
      return error.status === 401
        ? 'Please sign in to continue.'
        : 'You do not have permission to do that.';
    case 'canceled':
      return 'The request was canceled.';
    case 'api':
    case 'validation':
    case 'unknown':
      return error.message;
  }
}
