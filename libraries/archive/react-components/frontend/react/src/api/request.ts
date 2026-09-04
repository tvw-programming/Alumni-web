import { apiClient } from './axiosClient';

import type { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Shared typed request helpers. All feature services go through these —
 * no ad hoc fetch/axios calls elsewhere.
 */
export interface RequestOptions extends Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> {
  client?: AxiosInstance;
}

export interface ListQueryInput {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: Readonly<Record<string, string | number | boolean | null | undefined>>;
}

/** Builds transport-ready pagination/filter params without leaking Axios into callers. */
export function buildListQuery(input: ListQueryInput): Record<string, string | number | boolean> {
  const page = Math.max(0, Math.trunc(input.page ?? 0));
  const pageSize = Math.min(100, Math.max(1, Math.trunc(input.pageSize ?? 20)));
  const params: Record<string, string | number | boolean> = {
    limit: pageSize,
    skip: page * pageSize,
  };
  const search = input.search?.trim();
  if (search) params.q = search;
  if (input.sortBy) params.sortBy = input.sortBy;
  if (input.sortOrder) params.order = input.sortOrder;
  for (const [key, value] of Object.entries(input.filters ?? {})) {
    if (value !== null && value !== undefined && value !== '') params[key] = value;
  }
  return params;
}

export async function get<TResponse>(
  url: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { client = apiClient, ...config } = options;
  const response = await client.get<TResponse>(url, config);
  return response.data;
}

export async function post<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { client = apiClient, ...config } = options;
  const response = await client.post<TResponse>(url, body, config);
  return response.data;
}

export async function put<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { client = apiClient, ...config } = options;
  const response = await client.put<TResponse>(url, body, config);
  return response.data;
}

export async function patch<TResponse, TBody = unknown>(
  url: string,
  body: TBody,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { client = apiClient, ...config } = options;
  const response = await client.patch<TResponse>(url, body, config);
  return response.data;
}

export async function del<TResponse>(
  url: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { client = apiClient, ...config } = options;
  const response = await client.delete<TResponse>(url, config);
  return response.data;
}
