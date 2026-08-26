import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/app-config';
import { QueryCache } from '../../core/http/query-cache';
import { queryKeys } from '../../core/http/query-keys';

import type { DemoProduct, DemoProductListFilters } from './demo-product.types';

interface DemoProductListResponse {
  products: DemoProduct[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * Products, as signals.
 *
 * This is the Angular answer to the React app's `useProducts` +
 * `productsListOptions`. Three differences worth knowing:
 *
 * - **`httpResource` replaces `useQuery`.** Loading, error and value are
 *   signals directly, so a template reads `products.isLoading()` with no
 *   destructuring and no `async` pipe.
 * - **The request function is reactive.** Reading `filters()` inside it means
 *   changing a filter re-issues the request automatically — the same effect the
 *   React app gets from embedding filters in the query key.
 * - **Invalidation is explicit.** `httpResource` has no `invalidateQueries`, so
 *   the request reads `QueryCache.version(...)`; bumping that key changes the
 *   request identity and Angular refetches.
 */
/**
 * Provided by `ProductsPage`, not `providedIn: 'root'`.
 *
 * The products resource is page state, not application state: it should be
 * created when the page mounts and torn down with it, rather than living for
 * the life of the app holding a stale list. Anything genuinely app-wide
 * (`QueryCache`, `AuthStore`) stays root-provided.
 */
@Injectable()
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(QueryCache);

  readonly filters = signal<DemoProductListFilters>({ page: 0, pageSize: 25, search: '' });

  readonly products = httpResource<DemoProductListResponse>(() => {
    // Subscribing to the cache version is what makes invalidation work.
    this.cache.version(queryKeys.products.all);

    const { page, pageSize, search } = this.filters();
    const params: Record<string, string | number> = {
      limit: pageSize,
      skip: page * pageSize,
    };
    if (search?.trim()) params['q'] = search.trim();

    return {
      url: `${API_BASE_URL}/products${search?.trim() ? '/search' : ''}`,
      params,
    };
  });

  setSearch(search: string): void {
    // `update` keeps the other filters intact; resetting to page 0 matches the
    // React grid's behaviour when a search changes the result set.
    this.filters.update((current) => ({ ...current, search, page: 0 }));
  }

  /**
   * Persists one field of one product and returns the server's row.
   *
   * Deliberately not invalidating: the inline editor writes the result straight
   * into the grid, and a refetch would discard both that and the user's scroll
   * position — the same reasoning as `UserService.create`.
   */
  async update(id: number, patch: Partial<DemoProduct>): Promise<Partial<DemoProduct>> {
    return firstValueFrom(this.http.put<Partial<DemoProduct>>(`${API_BASE_URL}/products/${String(id)}`, patch));
  }

  /** Refetches every product query. Call after a create or update. */
  invalidate(): void {
    this.cache.invalidate(queryKeys.products.all);
  }
}
