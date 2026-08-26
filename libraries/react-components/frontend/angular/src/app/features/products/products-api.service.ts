import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { QueryCache } from '../../core/http/query-cache';
import { hasFiles, toFormData, toJsonBody } from '../../shared/forms/to-form-data';
import { queryKeys } from '../../core/http/query-keys';

import type { FormValues } from '../../shared/forms/form.types';
import type { Product, ProductListParams, ProductPage } from './product.types';

/**
 * The products API (`/api/products`).
 *
 * Same-origin, so nginx proxies it in the container and the dev server proxies
 * it in development — no base URL to configure and no CORS.
 *
 * Provided per page rather than at root: this holds page state (which page,
 * which filter), and a root instance would outlive the page holding a stale
 * list forever.
 */
@Injectable()
export class ProductsApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(QueryCache);

  readonly params = signal<ProductListParams>({
    page: 1,
    pageSize: 25,
    search: '',
    category: '',
    sortBy: '',
    sortDesc: true,
    withTotal: true,
  });

  /**
   * The list, as signals.
   *
   * Reading `params()` inside the request function is what makes paging and
   * filtering reactive — changing a param re-issues the request with no
   * subscription to manage. Reading the cache version is what makes explicit
   * invalidation work.
   */
  readonly list = httpResource<ProductPage>(() => {
    this.cache.version(queryKeys.products.all);

    const p = this.params();
    let params = new HttpParams()
      .set('page', p.page)
      .set('pageSize', p.pageSize)
      .set('withTotal', String(p.withTotal));

    if (p.search.trim()) params = params.set('search', p.search.trim());
    if (p.category) params = params.set('category', p.category);
    if (p.sortBy) {
      params = params.set('sortBy', p.sortBy).set('sortDir', p.sortDesc ? 'desc' : 'asc');
    }

    return { url: '/api/products', params };
  });

  readonly items = computed(() => this.list.value()?.items ?? []);
  readonly total = computed(() => this.list.value()?.total ?? null);
  readonly isLoading = computed(() => this.list.isLoading());

  /** True while a create is in flight, so the form can disable its button. */
  readonly creating = signal(false);

  setPage(page: number): void {
    this.params.update((p) => ({ ...p, page: Math.max(1, page) }));
  }

  setSearch(search: string): void {
    // Back to page 1: staying on page 5 of a narrower result set shows nothing.
    this.params.update((p) => ({ ...p, search, page: 1 }));
  }

  setSort(sortBy: string, sortDesc: boolean): void {
    this.params.update((p) => ({ ...p, sortBy, sortDesc, page: 1 }));
  }

  /**
   * Creates a product and returns the stored row.
   *
   * Picks its own transport: a form carrying `File` values must be multipart,
   * anything else is JSON. The API accepts both on the same endpoint, so this
   * is the only place the choice is made.
   *
   * Deliberately does **not** invalidate the list — the response already
   * contains the row, so the caller inserts it directly and the grid updates
   * without a refetch, keeping scroll position and filters intact.
   */
  async create(values: FormValues): Promise<Product> {
    this.creating.set(true);
    try {
      const body = hasFiles(values) ? toFormData(values) : toJsonBody(values);
      // No explicit Content-Type for FormData: the browser must set it so the
      // multipart boundary is included. Setting it by hand breaks the parse.
      return await firstValueFrom(this.http.post<Product>('/api/products', body));
    } finally {
      this.creating.set(false);
    }
  }

  /** Partial update, used by the grid's inline editors. */
  async update(id: number, patch: Record<string, unknown>): Promise<Product> {
    return firstValueFrom(this.http.patch<Product>(`/api/products/${String(id)}`, patch));
  }

  /** Refetches every product query. For changes made elsewhere. */
  invalidate(): void {
    this.cache.invalidate(queryKeys.products.all);
  }
}
