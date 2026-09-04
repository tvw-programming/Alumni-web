import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { AuthStore } from './auth-store';
import { QueryCache } from '../http/query-cache';
import { clearAccessToken, setAccessToken } from './auth-storage';

import type { AppError } from '../http/api-error';
import type {
  AuthSession,
  AuthUser,
  ForgotPasswordResult,
  LoginCredentials,
} from './auth.types';

/**
 * Client for the auth API (`api/internal/handler/auth_handler.go`).
 *
 * ## Where the tokens live
 *
 * - **Refresh token** — an httpOnly, SameSite=Lax cookie set by the server.
 *   Never touched here; the browser attaches it, which is why every call sets
 *   `withCredentials`.
 * - **Access token** — memory only, ~15 minutes. See `auth-storage.ts`.
 *
 * Same-origin (`/api/auth`) in every environment: nginx proxies it in the
 * container and the dev server proxies it too. Same-origin is also what lets
 * the cookie be SameSite=Lax rather than None.
 */
const AUTH_BASE = '/api/auth';

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

/** `AppError`'s auth variant models only 401/403; anything else is `api`. */
function authError(message: string, status: 401 | 403 = 401): AppError {
  return { kind: 'auth', status, message };
}

function serviceError(message: string, status: number): AppError {
  return { kind: 'api', status, message };
}

/** Prefers the API's own message over a generic one. */
function messageFrom(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { error?: { message?: string }; message?: string } | null;
    return body?.error?.message ?? body?.message ?? fallback;
  }
  return fallback;
}

function statusFrom(error: unknown): number {
  return error instanceof HttpErrorResponse ? error.status : 0;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(AuthStore);
  private readonly cache = inject(QueryCache);

  async login(credentials: LoginCredentials): Promise<AuthSession> {
    const email = credentials.email.trim();
    if (email.length === 0 || credentials.password.length === 0) {
      throw authError('Email and password are required');
    }

    let body: unknown;
    try {
      body = await firstValueFrom(
        this.http.post<unknown>(
          `${AUTH_BASE}/login`,
          { email, password: credentials.password, rememberMe: credentials.rememberMe ?? false },
          { withCredentials: true },
        ),
      );
    } catch (error) {
      const status = statusFrom(error);
      const message = messageFrom(error, 'Sign-in failed. Please try again.');
      throw status === 401 || status === 403
        ? authError(message, status)
        : serviceError(message, status);
    }

    if (!isSession(body)) {
      // Trusting a malformed response would mean inventing a role, and
      // inventing a role means inventing permissions.
      throw serviceError('The sign-in service returned an unexpected response.', 502);
    }

    this.adoptSession(body);
    return body;
  }

  /**
   * Spends the refresh cookie for a new session.
   *
   * Resolves to null rather than throwing when there is none — not being signed
   * in is the normal state on a first visit, not an error worth logging.
   */
  async restore(): Promise<AuthSession | null> {
    try {
      const body = await firstValueFrom(
        this.http.post<unknown>(`${AUTH_BASE}/refresh`, null, { withCredentials: true }),
      );
      if (!isSession(body)) return null;
      this.adoptSession(body);
      return body;
    } catch {
      this.forgetSession();
      return null;
    }
  }

  async logout(allDevices = false): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post(`${AUTH_BASE}/logout`, null, {
          withCredentials: true,
          params: allDevices ? { all: 'true' } : {},
        }),
      );
    } catch {
      // A failed logout must still clear local state, or the UI would claim the
      // user is signed in when they asked not to be.
    } finally {
      this.forgetSession();
    }
  }

  /**
   * Requests a reset link.
   *
   * Always resolves, even for an unknown address: the API answers identically
   * either way, and surfacing a difference here would reintroduce the account
   * enumeration the endpoint exists to prevent.
   */
  async requestPasswordReset(email: string): Promise<ForgotPasswordResult> {
    return firstValueFrom(
      this.http.post<ForgotPasswordResult>(`${AUTH_BASE}/forgot-password`, {
        email: email.trim(),
      }),
    );
  }

  async resetPassword(token: string, password: string): Promise<string> {
    try {
      const body = await firstValueFrom(
        this.http.post<{ message: string }>(`${AUTH_BASE}/reset-password`, { token, password }),
      );
      return body.message;
    } catch (error) {
      throw serviceError(
        messageFrom(error, 'This reset link is invalid or has expired.'),
        statusFrom(error),
      );
    }
  }

  private adoptSession(session: AuthSession): void {
    setAccessToken(session.token, session.expiresIn);
    this.store.setSession(session);
  }

  private forgetSession(): void {
    clearAccessToken();
    this.store.signOut();
    // Drop every cached query so the next user never sees the previous one's data.
    this.cache.invalidateAll();
  }
}
