import { AxiosError, type AxiosAdapter, type AxiosResponse } from 'axios';
import { describe, expect, it, vi } from 'vitest';

import { createApiClient, PROJECT_HEADER } from './axiosClient';
import { shouldRetryRequest } from './queryClient';
import { buildListQuery } from './request';

import type { AppError } from '@/types/api';

function response(config: Parameters<AxiosAdapter>[0], data: unknown, status = 200): AxiosResponse {
  return { config, data, headers: {}, status, statusText: status === 200 ? 'OK' : 'Error' };
}

describe('API foundation', () => {
  it('injects the project and authorization headers on every request', async () => {
    const adapter = vi.fn<AxiosAdapter>((config) =>
      Promise.resolve(response(config, { ok: true })),
    );
    const client = createApiClient({
      baseURL: 'https://example.test',
      getAuthToken: () => 'token-1',
    });

    await client.get('/resource', { adapter });

    const config = adapter.mock.calls[0][0];
    expect(config.headers.get(PROJECT_HEADER.key)).toBe(PROJECT_HEADER.value);
    expect(config.headers.get('Authorization')).toBe('Bearer token-1');
  });

  it('refreshes a 401 once and retries with the replacement token', async () => {
    let attempt = 0;
    let storedToken = 'expired';
    const refreshAuthToken = vi.fn(() => {
      storedToken = 'refreshed';
      return Promise.resolve(storedToken);
    });
    const adapter: AxiosAdapter = (config) => {
      attempt += 1;
      if (attempt === 1) {
        const unauthorized = response(config, { message: 'Expired' }, 401);
        return Promise.reject(
          new AxiosError('Expired', 'ERR_BAD_REQUEST', config, undefined, unauthorized),
        );
      }
      return Promise.resolve(response(config, { ok: true }));
    };
    const client = createApiClient({
      baseURL: 'https://example.test',
      getAuthToken: () => storedToken,
      refreshAuthToken,
    });

    const result = await client.get<{ ok: boolean }>('/protected', { adapter });

    expect(result.data.ok).toBe(true);
    expect(refreshAuthToken).toHaveBeenCalledOnce();
    expect(attempt).toBe(2);
  });

  it('builds bounded pagination, sorting, search, and filter params', () => {
    expect(
      buildListQuery({
        page: 2.8,
        pageSize: 500,
        search: '  phone ',
        sortBy: 'title',
        sortOrder: 'asc',
        filters: { active: true, category: 'mobile', ignored: null },
      }),
    ).toEqual({
      limit: 100,
      skip: 200,
      q: 'phone',
      sortBy: 'title',
      order: 'asc',
      active: true,
      category: 'mobile',
    });
  });

  it('retries transient failures but not auth, validation, cancellation, or 4xx errors', () => {
    const network: AppError = { kind: 'network', message: 'offline' };
    const badRequest: AppError = { kind: 'api', message: 'bad', status: 400 };
    const serverError: AppError = { kind: 'api', message: 'down', status: 503 };

    expect(shouldRetryRequest(0, network)).toBe(true);
    expect(shouldRetryRequest(0, serverError)).toBe(true);
    expect(shouldRetryRequest(0, badRequest)).toBe(false);
    expect(shouldRetryRequest(2, network)).toBe(false);
  });
});
