import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios';
import { describe, expect, it } from 'vitest';

import { getUserMessage, normalizeError } from './errors';

import type { AppError } from '@/types/api';

/**
 * normalizeError is the single funnel every failure in the app passes through
 * — the axios interceptor, React Query, and the error boundary all depend on
 * it producing the right `kind`. Getting a kind wrong silently downgrades a
 * "please sign in" into a generic message, so each branch is pinned here.
 */
function axiosErrorWithResponse(status: number, data: unknown, message = 'Request failed') {
  const headers = new AxiosHeaders();
  const config = { headers };
  const response = {
    status,
    data,
    statusText: '',
    headers,
    config,
  } as AxiosResponse;

  return new AxiosError(message, 'ERR_BAD_RESPONSE', config, undefined, response);
}

describe('normalizeError', () => {
  it('passes an existing AppError through untouched', () => {
    const original: AppError = { kind: 'validation', message: 'Bad', fieldErrors: { a: 'b' } };

    expect(normalizeError(original)).toBe(original);
  });

  it('maps a timeout code to the timeout kind, not a generic API error', () => {
    const headers = new AxiosHeaders();
    const error = new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED', { headers });

    expect(normalizeError(error)).toEqual({
      kind: 'timeout',
      message: 'The request timed out',
    });
  });

  it('maps a response-less axios error to the network kind', () => {
    const headers = new AxiosHeaders();
    const error = new AxiosError('Network Error', 'ERR_NETWORK', { headers });

    expect(normalizeError(error)).toEqual({
      kind: 'network',
      message: 'Network error — check your connection',
    });
  });

  it.each([401, 403] as const)('maps HTTP %i to the auth kind', (status) => {
    const result = normalizeError(axiosErrorWithResponse(status, { message: 'Nope' }));

    expect(result).toEqual({ kind: 'auth', message: 'Nope', status });
  });

  it('carries the server code and field errors through on an API error', () => {
    const result = normalizeError(
      axiosErrorWithResponse(422, {
        message: 'Validation failed',
        code: 'INVALID_BODY',
        errors: { name: 'is required' },
      }),
    );

    expect(result).toEqual({
      kind: 'api',
      message: 'Validation failed',
      status: 422,
      code: 'INVALID_BODY',
      fieldErrors: { name: 'is required' },
    });
  });

  it('falls back to the axios message when the body carries none', () => {
    const result = normalizeError(axiosErrorWithResponse(500, {}, 'Server exploded'));

    expect(result).toMatchObject({ kind: 'api', message: 'Server exploded', status: 500 });
  });

  it('treats an AbortError as canceled rather than unknown', () => {
    const result = normalizeError(new DOMException('The operation was aborted', 'AbortError'));

    expect(result).toEqual({ kind: 'canceled', message: 'Request was aborted' });
  });

  it('keeps the original Error as `cause` so stack traces survive', () => {
    const cause = new Error('boom');

    expect(normalizeError(cause)).toEqual({ kind: 'unknown', message: 'boom', cause });
  });

  it('handles a thrown non-Error without losing it', () => {
    expect(normalizeError('just a string')).toEqual({
      kind: 'unknown',
      message: 'An unexpected error occurred',
      cause: 'just a string',
    });
  });
});

describe('getUserMessage', () => {
  it('distinguishes 401 from 403', () => {
    expect(getUserMessage({ kind: 'auth', message: 'x', status: 401 })).toBe(
      'Please sign in to continue.',
    );
    expect(getUserMessage({ kind: 'auth', message: 'x', status: 403 })).toBe(
      'You do not have permission to do that.',
    );
  });

  it('surfaces the raw message for kinds the user can act on', () => {
    expect(getUserMessage({ kind: 'api', message: 'Name already taken', status: 409 })).toBe(
      'Name already taken',
    );
  });

  it('hides transport detail behind a friendly message', () => {
    expect(getUserMessage({ kind: 'network', message: 'ECONNREFUSED' })).toBe(
      'Cannot reach the server. Please check your connection.',
    );
  });
});
