import { get, post } from '@/api/request';

import type { NewUser, User, UserListFilters, UserListResponse } from '@/types/user';

export async function fetchUsers(
  filters: UserListFilters,
  signal?: AbortSignal,
): Promise<UserListResponse> {
  const trimmed = filters.search.trim();
  const url = trimmed ? '/users/search' : '/users';
  return get<UserListResponse>(url, {
    params: { q: trimmed || undefined, limit: 20 },
    signal,
  });
}

/**
 * Create a user via DummyJSON's mock endpoint (POST /users/add). The API echoes
 * the payload back with a generated id but doesn't persist it; the caller
 * prepends the returned row into the grid.
 */
export async function createUser(input: NewUser): Promise<User> {
  return post<User, NewUser>('/users/add', input);
}
