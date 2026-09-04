import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';
import { AuthStore } from './auth-store';
import { authGuard, permissionGuard } from './auth.guard';

import type { AuthSession, UserRole } from './auth.types';

/**
 * The guards restore the session by spending the httpOnly refresh cookie, so a
 * test signs someone in by stubbing that one call. There is no storage to seed:
 * the access token is held in memory by design.
 */
function sessionFor(role: UserRole): AuthSession {
  return {
    token: 'test-token',
    expiresIn: 900,
    user: { id: 1, email: 'tester@example.test', displayName: 'Tester', role },
  };
}

function signIn(role: UserRole) {
  const store = TestBed.inject(AuthStore);
  restoreSpy.mockImplementation(() => {
    store.setSession(sessionFor(role));
    return Promise.resolve(sessionFor(role));
  });
}

const restoreSpy = vi.fn<() => Promise<AuthSession | null>>();

const routes = [
  { path: 'login', children: [] },
  { path: 'admin/forbidden', children: [] },
  { path: 'admin/secret', canActivate: [authGuard], children: [] },
  {
    path: 'admin/diagnostics',
    canActivate: [permissionGuard(['diagnostics:read'])],
    children: [],
  },
  {
    path: 'admin/wipe',
    canActivate: [permissionGuard(['diagnostics:manage'])],
    children: [],
  },
];

describe('route guards', () => {
  beforeEach(() => {
    // Default: nobody is signed in, and the restore finds no cookie.
    restoreSpy.mockReset();
    restoreSpy.mockResolvedValue(null);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { restore: restoreSpy } },
      ],
    });
  });

  async function navigate(url: string): Promise<string> {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url).catch(() => undefined);
    return TestBed.inject(Router).url;
  }

  it('sends an anonymous visitor to login, preserving where they were headed', async () => {
    const url = await navigate('/admin/secret');
    expect(url).toContain('/login');
    expect(url).toContain('returnTo=%2Fadmin%2Fsecret');
  });

  it('lets a signed-in user through the authentication guard', async () => {
    signIn('user');
    expect(await navigate('/admin/secret')).toBe('/admin/secret');
  });

  it('admits a role that holds the required capability', async () => {
    signIn('user');
    expect(await navigate('/admin/diagnostics')).toBe('/admin/diagnostics');
  });

  it('sends an under-privileged user to /forbidden, not /login', async () => {
    // They are authenticated, so bouncing to login would be a dead end.
    signIn('user');
    const url = await navigate('/admin/wipe');
    expect(url).toContain('/admin/forbidden');
    expect(url).not.toContain('/login');
  });

  it('admits an admin to a managed capability', async () => {
    signIn('admin');
    expect(await navigate('/admin/wipe')).toBe('/admin/wipe');
  });

  it('sends an anonymous visitor to login even on a permission-guarded route', async () => {
    const url = await navigate('/admin/wipe');
    expect(url).toContain('/login');
  });
});
