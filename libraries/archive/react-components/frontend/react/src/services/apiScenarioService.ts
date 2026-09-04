import { buildListQuery, get } from '@/api/request';

import type { ApiPost, ApiTodo } from '@/types/apiScenario';
import type { Product, ProductListResponse } from '@/types/product';
import type { User } from '@/types/user';

export function fetchScenarioProduct(
  id: number,
  signal?: AbortSignal,
  delayMs?: number,
): Promise<Product> {
  return get<Product>(`/products/${id}`, { params: { delay: delayMs }, signal });
}

export function fetchScenarioUser(id: number, signal?: AbortSignal): Promise<User> {
  return get<User>(`/users/${id}`, { signal });
}

export function fetchScenarioTodo(id: number, signal?: AbortSignal): Promise<ApiTodo> {
  return get<ApiTodo>(`/todos/${id}`, { signal });
}

export function fetchScenarioPost(
  id: number,
  signal?: AbortSignal,
  delayMs?: number,
): Promise<ApiPost> {
  return get<ApiPost>(`/posts/${id}`, { params: { delay: delayMs }, signal });
}

export function fetchScenarioProductsByCategory(
  category: string,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  return get<ProductListResponse>(`/products/category/${encodeURIComponent(category)}`, {
    params: buildListQuery({ pageSize: 5, sortBy: 'title', sortOrder: 'asc' }),
    signal,
  });
}

export function fetchScenarioProductPage(
  page: number,
  pageSize: number,
  signal?: AbortSignal,
): Promise<ProductListResponse> {
  return get<ProductListResponse>('/products', {
    params: buildListQuery({ page, pageSize, sortBy: 'title', sortOrder: 'asc' }),
    signal,
  });
}
