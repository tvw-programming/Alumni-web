import { Injectable, computed, signal } from '@angular/core';

import { roleHas, roleHasAll, type Permission } from './permissions';

import type { AuthSession, AuthUser } from './auth.types';

/**
 * Authentication state as signals.
 *
 * Replaces the React app's `AuthContext`. A root-provided service holding a
 * signal gives the same shared state without a provider component, and only the
 * components that read `user()` re-render when it changes.
 *
 * `has()` is the Angular equivalent of `usePermission`: components ask for a
 * capability, never for a role, so the role model can change without touching a
 * component.
 */
@Injectable({ providedIn: 'root' })
export class AuthStore {
  // Starts empty: the access token lives in memory, so a reload has nothing to
  // read back. `AuthService.restore()` fills this in by spending the refresh
  // cookie.
  private readonly userSignal = signal<AuthUser | null>(null);
  private readonly restoringSignal = signal(true);

  readonly user = this.userSignal.asReadonly();

  /**
   * True until the initial restore settles.
   *
   * Guards must wait on this. Without it, a reload on a protected route renders
   * as signed-out for a moment and redirects to /login before the session has
   * had a chance to come back — losing the page the user was on.
   */
  readonly isRestoring = this.restoringSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.userSignal() !== null);
  readonly displayName = computed(() => this.userSignal()?.displayName ?? null);
  readonly role = computed(() => this.userSignal()?.role ?? null);

  /** Whether the signed-in user holds a capability. Reactive: safe in `computed`. */
  has(permission: Permission): boolean {
    return roleHas(this.userSignal()?.role, permission);
  }

  /** All-of variant, for actions needing more than one capability. */
  hasAll(permissions: readonly Permission[]): boolean {
    return roleHasAll(this.userSignal()?.role, permissions);
  }

  setSession(session: AuthSession): void {
    this.userSignal.set(session.user);
    this.restoringSignal.set(false);
  }

  signOut(): void {
    this.userSignal.set(null);
    this.restoringSignal.set(false);
  }

  /** Marks the initial restore as finished, whatever its outcome. */
  restoreSettled(): void {
    this.restoringSignal.set(false);
  }
}
