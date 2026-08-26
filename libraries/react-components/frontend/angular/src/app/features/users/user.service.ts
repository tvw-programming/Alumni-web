import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/app-config';
import { QueryCache } from '../../core/http/query-cache';
import { queryKeys } from '../../core/http/query-keys';

import type { NewUser, User, UserListFilters, UserListResponse } from './user.types';

/**
 * Users, as signals — the read half mirrors `ProductService`.
 *
 * The write half is where Angular has no direct answer to TanStack's
 * `useMutation`: there is no built-in "run this once and tell me how it went"
 * primitive, because `resource` is for state that *derives* from a request, not
 * for a command. So a mutation is a plain async method plus two signals the
 * caller can render. That is less machinery than `useMutation`, not more — the
 * one thing worth keeping is the invalidation, which is explicit here.
 */
@Injectable()
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(QueryCache);

  readonly filters = signal<UserListFilters>({ search: '' });

  readonly users = httpResource<UserListResponse>(() => {
    this.cache.version(queryKeys.users.all);

    const search = this.filters().search.trim();
    return {
      // dummyjson exposes search on a different path, as it does for products.
      url: `${API_BASE_URL}/users${search ? '/search' : ''}`,
      params: { limit: 50, ...(search ? { q: search } : {}) },
    };
  });

  /** True while a create is in flight, so the form can disable its button. */
  readonly creating = signal(false);

  setSearch(search: string): void {
    this.filters.update((current) => ({ ...current, search }));
  }

  /**
   * Creates a user and returns the server's representation of it.
   *
   * Deliberately does **not** invalidate the list. The response already
   * contains the created row, so the caller inserts it directly; invalidating
   * would refetch and throw that insert away — and on this demo API, which does
   * not persist writes, the row would disappear entirely. Callers that need a
   * refetch for other reasons can still call `invalidate()`.
   *
   * Failure is rethrown rather than swallowed, so a page can choose between a
   * snackbar, an inline message, or both. `creating` clears in `finally` so a
   * rejected request cannot leave the form stuck.
   */
  async create(user: NewUser): Promise<User> {
    this.creating.set(true);
    try {
      return await firstValueFrom(this.http.post<User>(`${API_BASE_URL}/users/add`, user));
    } finally {
      this.creating.set(false);
    }
  }

  /** Refetches every user query. For changes made outside this service. */
  invalidate(): void {
    this.cache.invalidate(queryKeys.users.all);
  }
}
