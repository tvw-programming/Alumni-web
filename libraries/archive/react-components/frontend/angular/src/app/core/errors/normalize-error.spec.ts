import { HttpErrorResponse } from '@angular/common/http';
import { describe, expect, it } from 'vitest';

import { getUserMessage, normalizeError } from './normalize-error';

/**
 * The transport-detection half of this file is Angular-specific — Axios's
 * `isAxiosError` / `isCancel` became `HttpErrorResponse` and its `status === 0`
 * case. The React suite cannot cover that, so these are new tests.
 *
 * `getUserMessage` is copied unchanged, and the wording assertions below are
 * deliberately identical to the React suite's: both apps must say the same
 * thing for the same failure.
 */
describe('normalizeError', () => {
  it('passes an AppError through untouched', () => {
    const original = { kind: 'api', message: 'boom', status: 500 } as const;
    expect(normalizeError(original)).toBe(original);
  });

  it('maps a server response to an api error, preferring the server message', () => {
    const result = normalizeError(
      new HttpErrorResponse({
        status: 500,
        error: { message: 'Database unavailable', code: 'DB_DOWN' },
        url: '/products',
      }),
    );
    expect(result).toMatchObject({ kind: 'api', status: 500, message: 'Database unavailable', code: 'DB_DOWN' });
  });

  it('carries field errors through for form display', () => {
    const result = normalizeError(
      new HttpErrorResponse({ status: 422, error: { message: 'Invalid', errors: { title: 'Required' } } }),
    );
    expect(result).toMatchObject({ kind: 'api', fieldErrors: { title: 'Required' } });
  });

  it('maps 401 and 403 to auth', () => {
    expect(normalizeError(new HttpErrorResponse({ status: 401 }))).toMatchObject({ kind: 'auth', status: 401 });
    expect(normalizeError(new HttpErrorResponse({ status: 403 }))).toMatchObject({ kind: 'auth', status: 403 });
  });

  it('treats status 0 as a network failure', () => {
    // Angular reports offline, DNS failure and CORS rejection all as status 0.
    const result = normalizeError(new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') }));
    expect(result.kind).toBe('network');
  });

  it('distinguishes an aborted request from a network failure', () => {
    // Both arrive as status 0; only the underlying AbortError separates them,
    // and a cancellation must NOT be retried or logged as a fault.
    const result = normalizeError(
      new HttpErrorResponse({ status: 0, error: new DOMException('aborted', 'AbortError') }),
    );
    expect(result.kind).toBe('canceled');
  });

  it('maps request-timeout statuses to timeout', () => {
    expect(normalizeError(new HttpErrorResponse({ status: 408 })).kind).toBe('timeout');
    expect(normalizeError(new HttpErrorResponse({ status: 504 })).kind).toBe('timeout');
  });

  it('maps a bare AbortError to canceled', () => {
    expect(normalizeError(new DOMException('aborted', 'AbortError')).kind).toBe('canceled');
  });

  it('maps a plain Error to unknown and keeps the cause', () => {
    const cause = new Error('exploded');
    const result = normalizeError(cause);
    expect(result).toMatchObject({ kind: 'unknown', message: 'exploded' });
    expect((result as { cause?: unknown }).cause).toBe(cause);
  });

  it('maps a non-Error throw to unknown', () => {
    expect(normalizeError('a string').kind).toBe('unknown');
    expect(normalizeError(null).kind).toBe('unknown');
  });
});

describe('getUserMessage', () => {
  it('replaces transport failures with actionable wording', () => {
    expect(getUserMessage({ kind: 'network', message: 'raw' })).toBe(
      'Cannot reach the server. Please check your connection.',
    );
    expect(getUserMessage({ kind: 'timeout', message: 'raw' })).toBe(
      'The server took too long to respond. Please try again.',
    );
    expect(getUserMessage({ kind: 'canceled', message: 'raw' })).toBe('The request was canceled.');
  });

  it('distinguishes signed-out from not-permitted', () => {
    expect(getUserMessage({ kind: 'auth', message: 'x', status: 401 })).toBe('Please sign in to continue.');
    expect(getUserMessage({ kind: 'auth', message: 'x', status: 403 })).toBe(
      'You do not have permission to do that.',
    );
  });

  it('passes the server message through for api and unknown errors', () => {
    expect(getUserMessage({ kind: 'api', message: 'Title already exists', status: 409 })).toBe(
      'Title already exists',
    );
    expect(getUserMessage({ kind: 'unknown', message: 'odd' })).toBe('odd');
  });
});
