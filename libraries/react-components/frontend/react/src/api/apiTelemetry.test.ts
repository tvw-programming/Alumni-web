import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { clearLogs, getLogsByChannel } from '@/utils/errorLogger';
import { setMonitoringSink } from '@/utils/monitoring';

import { CORRELATION_HEADER } from './apiTelemetry';
import { createApiClient, PROJECT_HEADER } from './axiosClient';

import type { AxiosAdapter } from 'axios';

/** Minimal adapter so no real request is made. */
function adapterReturning(status: number, data: unknown = {}): AxiosAdapter {
  return (config) =>
    status >= 200 && status < 300
      ? Promise.resolve({ data, status, statusText: 'OK', headers: {}, config })
      : Promise.reject(
          Object.assign(new Error(`Request failed with status code ${String(status)}`), {
            isAxiosError: true,
            config,
            response: { data, status, statusText: 'Error', headers: {}, config },
          }),
        );
}

beforeEach(() => {
  setMonitoringSink(() => undefined);
  clearLogs();
});

afterEach(() => {
  setMonitoringSink();
  clearLogs();
});

describe('api telemetry', () => {
  it('stamps a correlation header on every request alongside the project header', async () => {
    let seen: Record<string, unknown> = {};
    const client = createApiClient({ baseURL: 'https://example.test' });
    // Swapping the adapter after construction keeps the test-only seam out of
    // `ApiClientOptions` — the interceptors under test are already installed.
    client.defaults.adapter = (config) => {
      seen = config.headers.toJSON();
      return Promise.resolve({ data: {}, status: 200, statusText: 'OK', headers: {}, config });
    };

    await client.get('/ping');

    expect(seen[CORRELATION_HEADER]).toMatch(/^r-/);
    expect(seen[PROJECT_HEADER.key]).toBe(PROJECT_HEADER.value);
  });

  it('writes one api-channel entry per failed request, with endpoint, method and status', async () => {
    const client = createApiClient({ baseURL: 'https://example.test' });
    client.defaults.adapter = adapterReturning(500, { message: 'boom' });

    await expect(client.get('/products/1')).rejects.toMatchObject({ kind: 'api', status: 500 });

    const entries = getLogsByChannel('api');
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      channel: 'api',
      error: 'API_500',
      apiEndpoint: '/products/1',
      httpMethod: 'GET',
      status: 500,
      severity: 'fatal',
    });
    expect(entries[0].correlationId).toMatch(/^r-/);
    expect(entries[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('logs nothing for a successful request', async () => {
    const client = createApiClient({ baseURL: 'https://example.test' });
    client.defaults.adapter = adapterReturning(200, { ok: true });

    await client.get('/products/1');

    expect(getLogsByChannel('api')).toHaveLength(0);
  });

  it('skips canceled requests so unmount-driven aborts do not bury real failures', async () => {
    const controller = new AbortController();
    const client = createApiClient({ baseURL: 'https://example.test' });
    client.defaults.adapter = () => Promise.reject(new DOMException('canceled', 'AbortError'));

    controller.abort();
    await expect(client.get('/products/1', { signal: controller.signal })).rejects.toMatchObject({
      kind: 'canceled',
    });

    expect(getLogsByChannel('api')).toHaveLength(0);
  });
});
