import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { restoreSession } from '@/services/authService';
import { AuthProvider } from '@/store/authContext';

import { ProtectedRoute } from './ProtectedRoute';

import type { Permission } from '@/auth/permissions';
import type { UserRole } from '@/types/auth';

/**
 * The provider restores its session by spending the httpOnly refresh cookie,
 * which is a network call. Stubbing that one function is how a test signs
 * someone in — the access token lives in memory and there is no storage to seed.
 */
vi.mock('@/services/authService', () => ({
  restoreSession: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  getAccessToken: vi.fn(() => null),
}));

function signIn(role: UserRole) {
  vi.mocked(restoreSession).mockResolvedValue({
    token: 'test-token',
    expiresIn: 900,
    user: { id: 1, email: 'tester@example.test', displayName: 'Tester', role },
  });
}

function signedOut() {
  vi.mocked(restoreSession).mockResolvedValue(null);
}

function renderGuarded(requires?: readonly Permission[]) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/admin/secret']}>
        <Routes>
          <Route element={<ProtectedRoute requires={requires} />}>
            <Route path="/admin/secret" element={<div>protected content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
          <Route path="/forbidden" element={<div>forbidden page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

beforeEach(() => {
  signedOut();
});

describe('ProtectedRoute', () => {
  it('sends an anonymous visitor to login', async () => {
    renderGuarded();

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('lets an admin through', async () => {
    signIn('admin');
    renderGuarded(['data:write']);

    expect(await screen.findByText('protected content')).toBeInTheDocument();
  });

  it('sends an authorised-but-underprivileged user to /forbidden, not /login', async () => {
    // The distinction matters: a `user` is authenticated, so bouncing them to
    // login would be an infinite loop with no way out.
    signIn('user');
    renderGuarded(['data:write']);

    expect(await screen.findByText('forbidden page')).toBeInTheDocument();
    expect(screen.queryByText('login page')).not.toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('admits a user to a capability their role does hold', async () => {
    signIn('user');
    renderGuarded(['diagnostics:read']);

    expect(await screen.findByText('protected content')).toBeInTheDocument();
  });

  it('defaults to requiring admin:access rather than to being open', async () => {
    // A route that forgets `requires` must still be gated. Both roles hold
    // admin:access, so the default admits them but still blocks anonymity.
    signIn('user');
    renderGuarded();

    expect(await screen.findByText('protected content')).toBeInTheDocument();
  });

  it('requires every listed capability, not just one', async () => {
    signIn('user');
    renderGuarded(['diagnostics:read', 'diagnostics:manage']);

    expect(await screen.findByText('forbidden page')).toBeInTheDocument();
  });
});
