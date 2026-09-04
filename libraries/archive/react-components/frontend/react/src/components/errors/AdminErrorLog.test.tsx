import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { restoreSession } from '@/services/authService';
import { AuthProvider } from '@/store/authContext';
import { clearLogs, logError } from '@/utils/errorLogger';
import { setMonitoringSink } from '@/utils/monitoring';

import { AdminErrorLog } from './AdminErrorLog';

import type { UserRole } from '@/types/auth';
import type { TestReport } from '@/types/testReport';

/**
 * AuthProvider restores its session by spending the httpOnly refresh cookie, so
 * stubbing that call is how a test signs someone in. The toolbar's destructive
 * actions are gated on `diagnostics:manage`, which only an admin holds.
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

function renderConsole() {
  // A dedicated client per test: the Unit tests tab fetches the report, and a
  // shared cache would leak one case's report into the next.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    // AuthProvider is required: the toolbar and the Unit tests tab gate
    // destructive actions on `diagnostics:manage`.
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <AdminErrorLog />
      </QueryClientProvider>
    </AuthProvider>,
  );
}

function stubReport(report: TestReport | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() =>
      Promise.resolve({
        ok: report !== null,
        json: () => Promise.resolve(report),
      } as Response),
    ),
  );
}

beforeEach(() => {
  setMonitoringSink(() => undefined);
  clearLogs();
  window.sessionStorage.clear();
  // Most cases exercise the console's behaviour, not its gating, so they run
  // as an admin; the permission cases sign in explicitly.
  signIn('admin');
  stubReport(null);
});

afterEach(() => {
  setMonitoringSink();
  clearLogs();
  window.sessionStorage.clear();
  vi.unstubAllGlobals();
});

describe('AdminErrorLog', () => {
  it('opens on the API tab and shows only api-channel entries', () => {
    logError({
      channel: 'api',
      error: 'API_500',
      errorDescription: 'Server error',
      apiEndpoint: '/products/1',
      httpMethod: 'GET',
      status: 500,
    });
    logError({ channel: 'app', error: 'BOUNDARY_UNKNOWN', errorDescription: 'Render crash' });

    renderConsole();

    const table = screen.getByRole('table');
    expect(within(table).getByText('/products/1')).toBeInTheDocument();
    expect(within(table).queryByText('BOUNDARY_UNKNOWN')).not.toBeInTheDocument();
  });

  it('switches to the application tab and shows only app-channel entries', async () => {
    const user = userEvent.setup();
    logError({ channel: 'api', error: 'API_500', errorDescription: 'Server error' });
    logError({ channel: 'app', error: 'BOUNDARY_UNKNOWN', errorDescription: 'Render crash' });

    renderConsole();
    await user.click(screen.getByRole('tab', { name: /application/i }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('BOUNDARY_UNKNOWN')).toBeInTheDocument();
    expect(within(table).queryByText('API_500')).not.toBeInTheDocument();
  });

  it('clears one channel without touching the other', async () => {
    const user = userEvent.setup();
    logError({ channel: 'api', error: 'API_500', errorDescription: 'Server error' });
    logError({ channel: 'app', error: 'BOUNDARY_UNKNOWN', errorDescription: 'Render crash' });

    renderConsole();
    // `findBy`, not `getBy`: the destructive actions appear only once the
    // session restore settles, and that is now a promise.
    await user.click(await screen.findByRole('button', { name: /clear api/i }));

    expect(screen.getByText(/no api failures recorded/i)).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /application/i }));
    expect(screen.getByText('BOUNDARY_UNKNOWN')).toBeInTheDocument();
  });

  it('filters by level', async () => {
    const user = userEvent.setup();
    logError({ channel: 'api', error: 'API_500', errorDescription: 'Server error' });
    logError({
      channel: 'api',
      level: 'warning',
      error: 'API_404',
      errorDescription: 'Missing thing',
    });

    renderConsole();
    await user.click(screen.getByLabelText('Level'));
    await user.click(screen.getByRole('option', { name: 'Warning' }));

    expect(screen.getByText('API_404')).toBeInTheDocument();
    expect(screen.queryByText('API_500')).not.toBeInTheDocument();
  });

  it('tells the operator how to generate a test report when none exists', async () => {
    const user = userEvent.setup();
    renderConsole();

    await user.click(screen.getByRole('tab', { name: /unit tests/i }));

    expect(await screen.findByText(/no test report yet/i)).toBeInTheDocument();
  });

  it('runs the suite on demand and refreshes the report timestamp', async () => {
    const user = userEvent.setup();
    const before = new Date('2026-01-01T10:00:00Z').toISOString();
    const after = new Date('2026-01-01T11:30:00Z').toISOString();
    const report = (generatedAt: string): TestReport => ({
      generatedAt,
      status: 'passed',
      durationMs: 900,
      totals: { files: 1, tests: 3, passed: 3, failed: 0, skipped: 0 },
      failures: [],
      unhandledErrors: [],
    });

    // First fetch returns the stale report, the POST runs the suite, and the
    // refetch afterwards must pick up the newly written artifact.
    let current = report(before);
    const fetchMock = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        current = report(after);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ exitCode: 0, durationMs: 1234, output: '' }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve(current) } as Response);
    });
    vi.stubGlobal('fetch', fetchMock);

    renderConsole();
    await user.click(screen.getByRole('tab', { name: /unit tests/i }));
    expect(await screen.findByText(`run ${new Date(before).toLocaleString()}`)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /run unit tests/i }));

    expect(await screen.findByText(`run ${new Date(after).toLocaleString()}`)).toBeInTheDocument();
    expect(screen.getByText(/exit code 0/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/__run-unit-tests', { method: 'POST' });
  });

  it('surfaces a runner that could not be started', async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
        init?.method === 'POST'
          ? Promise.resolve({ ok: false, status: 404 } as Response)
          : Promise.resolve({ ok: false } as Response),
      ),
    );

    renderConsole();
    await user.click(screen.getByRole('tab', { name: /unit tests/i }));
    await user.click(screen.getByRole('button', { name: /run unit tests/i }));

    expect(await screen.findByText(/could not start the test run/i)).toBeInTheDocument();
  });

  it('hides destructive controls from a role without diagnostics:manage', async () => {
    const user = userEvent.setup();
    window.sessionStorage.clear();
    signIn('user');
    logError({ channel: 'api', error: 'API_500', errorDescription: 'Server error' });

    renderConsole();

    // Reading is allowed...
    expect(screen.getByText('API_500')).toBeInTheDocument();
    // ...but wiping the channel is not.
    expect(screen.queryByRole('button', { name: /clear api/i })).not.toBeInTheDocument();
    // Exporting is reading, so it stays.
    expect(screen.getByRole('button', { name: '.json' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: /unit tests/i }));
    expect(screen.queryByRole('button', { name: /run unit tests/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
  });

  it('renders unit-test failures from the report artifact', async () => {
    const user = userEvent.setup();
    stubReport({
      generatedAt: new Date().toISOString(),
      status: 'failed',
      durationMs: 1200,
      totals: { files: 2, tests: 10, passed: 9, failed: 1, skipped: 0 },
      failures: [
        {
          file: 'src/utils/errors.test.ts',
          suite: 'normalizeError',
          name: 'maps a timeout',
          message: 'expected "network" to be "timeout"',
          errorName: 'AssertionError',
          diff: '- expected: timeout\n+ actual:   network',
          stack: 'at normalizeError (src/utils/errors.ts:21:5)',
          durationMs: 4,
        },
      ],
      unhandledErrors: [],
    });

    renderConsole();
    await user.click(screen.getByRole('tab', { name: /unit tests/i }));

    expect(await screen.findByText('normalizeError > maps a timeout')).toBeInTheDocument();
    expect(screen.getByText('src/utils/errors.test.ts')).toBeInTheDocument();
    expect(screen.getByText(/expected "network" to be "timeout"/)).toBeInTheDocument();
    expect(screen.getByText(/1 failed/)).toBeInTheDocument();
  });
});
