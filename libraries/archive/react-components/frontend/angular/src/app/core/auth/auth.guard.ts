import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import { AuthService } from './auth.service';
import { AuthStore } from './auth-store';

import type { Permission } from './permissions';

/**
 * Route guards on two axes, replacing the React app's `ProtectedRoute`.
 *
 * 1. **Authentication** — no session redirects to `/login`, preserving the
 *    attempted URL so login can send them back.
 * 2. **Authorization** — a session lacking a required capability redirects to
 *    `/admin/forbidden`, *not* to login: they are already authenticated, so
 *    asking them to sign in again would be a dead end.
 *
 * These are UI guards, not a security boundary. They decide what to *render*;
 * a client can always be modified. The API enforces the same rules again on
 * every request — see `api/internal/handler/auth_middleware.go` — which is what
 * actually protects anything.
 */

/**
 * Waits for the initial session restore before deciding.
 *
 * The access token lives in memory, so a reload starts signed out and the
 * session comes back asynchronously. Deciding before that settles would bounce
 * a signed-in user to /login on every refresh.
 */
async function sessionReady(): Promise<void> {
  const store = inject(AuthStore);
  if (!store.isRestoring()) return;
  await inject(AuthService).restore();
  store.restoreSettled();
}

/** Requires a session. Use on any route inside the authenticated shell. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const auth = inject(AuthStore);
  const router = inject(Router);

  await sessionReady();

  if (auth.isAuthenticated()) return true;

  return router.createUrlTree(['/login'], {
    queryParams: { returnTo: state.url },
  });
};

/**
 * Requires specific capabilities.
 *
 * Returns a guard rather than being one, so routes read declaratively:
 * `canActivate: [authGuard, permissionGuard(['diagnostics:read'])]`.
 */
export function permissionGuard(required: readonly Permission[]): CanActivateFn {
  return async (_route, state) => {
    const auth = inject(AuthStore);
    const router = inject(Router);

    // Same reason as `authGuard`: a permission check on a session that has not
    // been restored yet always fails.
    await sessionReady();

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/login'], { queryParams: { returnTo: state.url } });
    }
    if (auth.hasAll(required)) return true;

    return router.createUrlTree(['/admin/forbidden'], {
      queryParams: { from: state.url },
    });
  };
}
