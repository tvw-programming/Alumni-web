import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { roleHasAll, type Permission } from '@/auth/permissions';
import { useAuth } from '@/store/authContext';

import type { ReactNode } from 'react';

interface ProtectedRouteProps {
  children?: ReactNode;
  /**
   * Capabilities required to enter. A signed-in user missing any of them is
   * sent to `/forbidden` rather than to login — they are already authenticated,
   * so asking them to sign in again would be a dead end.
   *
   * Defaults to `['admin:access']`: a route wrapped in this component requires
   * at least the ability to reach the authenticated shell. Opting out has to be
   * deliberate (`requires={[]}`), so a new protected route is never left
   * accidentally ungated.
   */
  requires?: readonly Permission[];
}

/**
 * Guards nested routes on two axes.
 *
 * 1. **Authentication** — no session redirects to `/login`, preserving the
 *    attempted URL in `location.state.returnTo` so login can send them back.
 * 2. **Authorization** — a session lacking a required capability redirects to
 *    `/forbidden`.
 *
 * This is a UI guard, not a security boundary: it decides what to *render*.
 * A client can always be modified, so anything that actually matters must be
 * enforced again server-side — which the API now does, on every request.
 */
export function ProtectedRoute({ children, requires = ['admin:access'] }: ProtectedRouteProps) {
  const { user, isRestoring } = useAuth();
  const location = useLocation();

  // The access token is held in memory, so a reload starts signed out and the
  // session comes back asynchronously. Redirecting during that window would
  // bounce a signed-in user to /login on every refresh — and, because the
  // redirect is `replace`, lose the page they were on.
  if (isRestoring) {
    return (
      <Box display="flex" justifyContent="center" py={8} aria-busy="true">
        <CircularProgress aria-label="Restoring your session" />
      </Box>
    );
  }

  if (user === null) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ returnTo }} />;
  }

  if (!roleHasAll(user.role, requires)) {
    return <Navigate to="/forbidden" replace state={{ from: location.pathname }} />;
  }

  return children !== undefined ? <>{children}</> : <Outlet />;
}
