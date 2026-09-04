import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import {
  accessTokenIsStale,
  getAccessToken,
  login,
  logout,
  requestPasswordReset,
  resetPassword,
  restoreSession,
} from './authService';

import type * as AxiosNamespace from 'axios';

type AxiosModule = typeof AxiosNamespace;

/**
 * The service is tested against a stubbed network rather than a stubbed
 * service, so the parts that matter — response validation, where the token is
 * kept, what happens on failure — are all exercised for real.
 */
const post = vi.fn();

vi.mock('axios', async () => {
  const actual = await vi.importActual<AxiosModule>('axios');
  return {
    ...actual,
    default: {
      ...actual.default,
      create: () => ({
        post: (...args: unknown[]): unknown => post(...args) as unknown,
      }),
      isAxiosError: actual.default.isAxiosError,
    },
  };
});

const validSession = {
  token: 'header.payload.signature',
  expiresIn: 900,
  user: { id: 1, email: 'ada@example.test', displayName: 'Ada', role: 'admin' },
};

function axiosError(status: number, message: string) {
  return Object.assign(new Error(message), {
    isAxiosError: true,
    response: { status, data: { error: { message } } },
  });
}

beforeEach(() => {
  post.mockReset();
});

afterEach(async () => {
  post.mockResolvedValue({ data: {} });
  await logout();
});

describe('login', () => {
  it('sends the credentials and keeps the access token in memory', async () => {
    post.mockResolvedValue({ data: validSession });

    const session = await login({ email: 'ada@example.test', password: 'pw', rememberMe: true });

    expect(post).toHaveBeenCalledWith('/login', {
      email: 'ada@example.test',
      password: 'pw',
      rememberMe: true,
    });
    expect(session.user.role).toBe('admin');
    expect(getAccessToken()).toBe(validSession.token);
  });

  it('never puts the token in storage', async () => {
    // The whole point of holding it in memory: anything script can read,
    // injected script can steal.
    post.mockResolvedValue({ data: validSession });
    await login({ email: 'ada@example.test', password: 'pw' });

    // Reads the real globals deliberately: the safeStorage wrapper would hide
    // what is actually in storage, which is exactly what is being asserted.
    // eslint-disable-next-line no-restricted-globals
    const stored = { ...localStorage, ...sessionStorage };
    const everything = JSON.stringify(stored);
    expect(everything).not.toContain(validSession.token);
  });

  it('rejects empty credentials before touching the network', async () => {
    await expect(login({ email: '  ', password: '' })).rejects.toMatchObject({ kind: 'auth' });
    expect(post).not.toHaveBeenCalled();
  });

  it('refuses a malformed response rather than inventing a role', async () => {
    post.mockResolvedValue({ data: { token: 'x', expiresIn: 900, user: { id: 1 } } });
    await expect(login({ email: 'a@b.test', password: 'pw' })).rejects.toMatchObject({
      kind: 'api',
      status: 502,
    });
    expect(getAccessToken()).toBeNull();
  });

  it('rejects an unknown role', async () => {
    post.mockResolvedValue({
      data: { ...validSession, user: { ...validSession.user, role: 'superuser' } },
    });
    await expect(login({ email: 'a@b.test', password: 'pw' })).rejects.toMatchObject({
      status: 502,
    });
  });

  it('surfaces the API message on bad credentials', async () => {
    post.mockRejectedValue(axiosError(401, 'Email or password is incorrect.'));
    await expect(login({ email: 'a@b.test', password: 'nope' })).rejects.toMatchObject({
      kind: 'auth',
      message: 'Email or password is incorrect.',
    });
  });

  it('defaults rememberMe to false', async () => {
    post.mockResolvedValue({ data: validSession });
    await login({ email: 'a@b.test', password: 'pw' });
    expect(post).toHaveBeenCalledWith('/login', expect.objectContaining({ rememberMe: false }));
  });
});

describe('restoreSession', () => {
  it('returns null when there is no session, rather than throwing', async () => {
    // Not being signed in is the normal state on a first visit.
    post.mockRejectedValue(axiosError(401, 'No session to refresh.'));
    await expect(restoreSession()).resolves.toBeNull();
  });

  it('returns null for a malformed refresh response', async () => {
    post.mockResolvedValue({ data: { nonsense: true } });
    await expect(restoreSession()).resolves.toBeNull();
  });

  it('restores the token when the cookie is still good', async () => {
    post.mockResolvedValue({ data: validSession });
    const session = await restoreSession();
    expect(session?.user.email).toBe('ada@example.test');
    expect(accessTokenIsStale()).toBe(false);
  });
});

describe('logout', () => {
  it('clears the in-memory token even when the request fails', async () => {
    post.mockResolvedValue({ data: validSession });
    await login({ email: 'a@b.test', password: 'pw' });
    expect(getAccessToken()).not.toBeNull();

    post.mockRejectedValue(new Error('network down'));
    await logout();

    // A failed logout must still clear local state, or the UI would claim the
    // user is signed in when they asked not to be.
    expect(getAccessToken()).toBeNull();
  });
});

describe('password reset', () => {
  it('passes the API message through unchanged', async () => {
    post.mockResolvedValue({ data: { message: 'If that email is registered, …' } });
    await expect(requestPasswordReset(' ada@example.test ')).resolves.toMatchObject({
      message: 'If that email is registered, …',
    });
    expect(post).toHaveBeenCalledWith('/forgot-password', { email: 'ada@example.test' });
  });

  it('reports an expired reset token', async () => {
    post.mockRejectedValue(axiosError(400, 'This reset link is invalid or has expired.'));
    await expect(resetPassword('stale', 'a long enough passphrase')).rejects.toMatchObject({
      message: 'This reset link is invalid or has expired.',
    });
  });
});
