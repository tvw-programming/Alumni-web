import axios from 'axios';

import { isAppError, type AppError } from '@/types/api';

interface ServerErrorBody {
  message?: string;
  error?: string;
  code?: string;
  errors?: Record<string, string>;
}

/** Normalize anything thrown anywhere in the app into a typed AppError. */
export function normalizeError(error: unknown): AppError {
  if (isAppError(error)) return error;

  if (axios.isCancel(error)) {
    return { kind: 'canceled', message: 'Request was canceled' };
  }

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return { kind: 'timeout', message: 'The request timed out' };
    }
    const response = error.response;
    if (!response) {
      return { kind: 'network', message: 'Network error — check your connection' };
    }
    const body = (response.data ?? {}) as ServerErrorBody;
    const message = body.message ?? body.error ?? error.message;
    if (response.status === 401 || response.status === 403) {
      return { kind: 'auth', message, status: response.status };
    }
    return {
      kind: 'api',
      message,
      status: response.status,
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

/** User-facing message per error kind. */
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
