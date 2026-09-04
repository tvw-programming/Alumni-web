/**
 * Client for the auth API (`api/internal/handler/auth_handler.go`).
 *
 * ## Where the tokens live, and why
 *
 * - **Refresh token** — an httpOnly, SameSite=Lax cookie set by the server.
 *   Script cannot read it, so an XSS bug cannot exfiltrate a 30-day session.
 *   It is never touched by this file; the browser attaches it automatically,
 *   which is why every call here sets `withCredentials`.
 * - **Access token** — held in memory only, for ~15 minutes. Deliberately *not*
 *   in localStorage: anything script can read, injected script can steal.
 *
 * The cost of in-memory is that a page reload loses the access token. That is
 * what `restoreSession` is for: it spends the refresh cookie for a new pair.
 */
import axios from 'axios';

import type { AppError } from '@/types/api';
import type { AuthSession, AuthUser, LoginCredentials, UserRole } from '@/types/auth';

/**
 * Same-origin: nginx proxies `/api` to the API container in every environment,
 * and the Vite dev server proxies it too. Same-origin is also what lets the
 * refresh cookie be SameSite=Lax rather than None.
 */
const AUTH_BASE = '/api/auth';

/** A dedicated client: these endpoints need cookies and must not carry the
 *  shared client's bearer interceptor, which would be circular here. */
const authClient = axios.create({
  baseURL: AUTH_BASE,
  withCredentials: true,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

/* ------------------------------------------------------------------ */
/* In-memory access token                                              */
/* ------------------------------------------------------------------ */

let accessToken: string | null = null;
let accessTokenExpiresAt = 0;

export function getAccessToken(): string | null {
  return accessToken;
}

function rememberAccessToken(session: AuthSession): void {
  accessToken = session.token;
  accessTokenExpiresAt = Date.now() + session.expiresIn * 1000;
}

function forgetAccessToken(): void {
  accessToken = null;
  accessTokenExpiresAt = 0;
}

/** True when the token is gone or within 30s of expiring. */
export function accessTokenIsStale(): boolean {
  return accessToken === null || Date.now() > accessTokenExpiresAt - 30_000;
}

/* ------------------------------------------------------------------ */
/* Response validation                                                 */
/* ------------------------------------------------------------------ */

function isUser(value: unknown): value is AuthUser {
  if (typeof value !== 'object' || value === null) return false;
  const u = value as Partial<AuthUser>;
  return (
    typeof u.id === 'number' &&
    typeof u.email === 'string' &&
    typeof u.displayName === 'string' &&
    (u.role === 'admin' || u.role === 'user')
  );
}

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false;
  const s = value as Partial<AuthSession>;
  return typeof s.token === 'string' && typeof s.expiresIn === 'number' && isUser(s.user);
}

/** `AppError` is a discriminated union, not an Error subclass. */
function authError(message: string, status: 401 | 403 = 401): AppError {
  return { kind: 'auth', status, message };
}

function serviceError(message: string, status: number): AppError {
  return { kind: 'api', status, message };
}

/** Surfaces the API's own message when it sent one, rather than a generic string. */
function messageFrom(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as
      { error?: { message?: string }; message?: string } | undefined;
    return body?.error?.message ?? body?.message ?? fallback;
  }
  return fallback;
}

function statusFrom(error: unknown): number {
  return axios.isAxiosError(error) ? (error.response?.status ?? 0) : 0;
}

/* ------------------------------------------------------------------ */
/* Operations                                                          */
/* ------------------------------------------------------------------ */

export async function login(credentials: LoginCredentials): Promise<AuthSession> {
  const email = credentials.email.trim();
  if (email.length === 0 || credentials.password.length === 0) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw authError('Email and password are required');
  }

  let body: unknown;
  try {
    const response = await authClient.post<unknown>('/login', {
      email,
      password: credentials.password,
      rememberMe: credentials.rememberMe ?? false,
    });
    body = response.data;
  } catch (error) {
    const status = statusFrom(error);
    const message = messageFrom(error, 'Sign-in failed. Please try again.');
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw status === 401 || status === 403
      ? authError(message, status)
      : serviceError(message, status);
  }

  if (!isSession(body)) {
    // A malformed response must not become a session: trusting it would mean
    // inventing a role, and inventing a role means inventing permissions.
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw serviceError('The sign-in service returned an unexpected response.', 502);
  }
  rememberAccessToken(body);
  return body;
}

/**
 * Exchanges the refresh cookie for a new session.
 *
 * Returns null rather than throwing when there is no session — "not signed in"
 * is the normal state on a first visit, not an error worth logging.
 */
export async function restoreSession(): Promise<AuthSession | null> {
  try {
    const { data } = await authClient.post<unknown>('/refresh');
    if (!isSession(data)) return null;
    rememberAccessToken(data);
    return data;
  } catch {
    forgetAccessToken();
    return null;
  }
}

export async function logout(allDevices = false): Promise<void> {
  try {
    await authClient.post('/logout', null, { params: allDevices ? { all: 'true' } : undefined });
  } catch {
    // A failed logout must still clear local state, or the UI would claim the
    // user is signed in when they asked not to be.
  } finally {
    forgetAccessToken();
  }
}

export interface ForgotPasswordResult {
  message: string;
  /** Present only when the API runs in development mode. */
  devResetUrl?: string;
}

/**
 * Requests a reset link.
 *
 * Always resolves, even for an unknown address — the API answers identically
 * either way, and surfacing a difference here would reintroduce the account
 * enumeration the endpoint is designed to prevent.
 */
export async function requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
  const { data } = await authClient.post<ForgotPasswordResult>('/forgot-password', {
    email: email.trim(),
  });
  return data;
}

export async function resetPassword(token: string, password: string): Promise<string> {
  try {
    const { data } = await authClient.post<{ message: string }>('/reset-password', {
      token,
      password,
    });
    return data.message;
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/only-throw-error
    throw serviceError(
      messageFrom(error, 'This reset link is invalid or has expired.'),
      statusFrom(error),
    );
  }
}

export type { AuthSession, AuthUser, LoginCredentials, UserRole };
