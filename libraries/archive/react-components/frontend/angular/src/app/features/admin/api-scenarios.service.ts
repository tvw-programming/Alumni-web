import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, inject, resource, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/app-config';
import { QueryCache } from '../../core/http/query-cache';
import { queryKeys } from '../../core/http/query-keys';

import type { DemoProduct } from '../products/demo-product.types';

interface ProductPage {
  products: DemoProduct[];
  total: number;
  skip: number;
  limit: number;
}

/**
 * The data layer behind the API Scenarios page.
 *
 * This is where the port diverges most from React, which leaned on TanStack
 * Query for pagination keys, cancellation and optimistic updates. Angular's
 * answers:
 *
 * - **Pagination** — the request function reads `page()`, so changing the page
 *   re-issues the request. That is the same effect React got from putting the
 *   page in the query key, without a key.
 * - **Cancellation** — `resource()` gives its loader an `AbortSignal` that
 *   fires when the params change, so cancelling is a signal change rather than
 *   an `AbortController` threaded through every call. Note that `httpResource`
 *   alone is *not* enough here; see `delayed` below.
 * - **Optimistic updates** — no `onMutate`/`onError` hooks, so the snapshot and
 *   rollback are written out explicitly. Fewer moving parts, and the rollback
 *   is visible rather than implied.
 */
@Injectable()
export class ApiScenariosService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(QueryCache);

  // ---- Scenario 1: typed pagination -------------------------------------

  readonly page = signal(0);
  readonly pageSize = 4;

  readonly productPage = httpResource<ProductPage>(() => ({
    url: `${API_BASE_URL}/products`,
    params: { limit: this.pageSize, skip: this.page() * this.pageSize },
  }));

  nextPage(): void {
    this.page.update((current) => current + 1);
  }

  previousPage(): void {
    this.page.update((current) => Math.max(0, current - 1));
  }

  // ---- Scenario 2: cancellation -----------------------------------------

  /** Null means "do not request"; a resource with undefined params stays idle. */
  readonly delayedId = signal<number | null>(null);

  /**
   * A deliberately slow request that can be aborted mid-flight.
   *
   * This uses `resource()` rather than `httpResource`, and the difference is
   * the point of the scenario. Clearing the signal that `httpResource` depends
   * on moves the *resource* back to idle, but — measured over the Chrome
   * DevTools Protocol — the HTTP request it had already started still runs to
   * completion. The UI stops listening; the network does not stop.
   *
   * `resource()` hands its loader an `AbortSignal` that is aborted when the
   * params change or the resource is destroyed. Passing it to `fetch` is what
   * actually cancels the request, and it is the direct counterpart of the
   * `AbortSignal` TanStack Query supplies in the React app.
   */
  readonly delayed = resource<DemoProduct, number | null>({
    params: () => this.delayedId(),
    loader: async ({ params: id, abortSignal }) => {
      if (id === null) return undefined as unknown as DemoProduct;
      const response = await fetch(`${API_BASE_URL}/products/${String(id)}?delay=4000`, {
        signal: abortSignal,
      });
      if (!response.ok) throw new Error(`Request failed with status ${String(response.status)}`);
      return (await response.json()) as DemoProduct;
    },
  });

  startDelayed(): void {
    this.delayedId.set(Math.floor(Math.random() * 20) + 1);
  }

  /** Aborts the in-flight request by changing the params the loader depends on. */
  cancelDelayed(): void {
    this.delayedId.set(null);
  }

  // ---- Scenario 3: optimistic cache update ------------------------------

  readonly optimisticTitle = signal<string | null>(null);
  readonly optimisticPending = signal(false);

  readonly sourceProduct = httpResource<DemoProduct>(() => {
    this.cache.version(queryKeys.products.detail(1));
    return { url: `${API_BASE_URL}/products/1` };
  });

  /**
   * Renames product 1, showing the new title immediately and restoring the old
   * one if the request fails.
   *
   * The local override lives in its own signal rather than being written into
   * the resource: a resource's value is server state, and letting a page write
   * to it makes "what the server said" unknowable the moment anything goes
   * wrong.
   */
  async renameOptimistically(title: string): Promise<void> {
    const snapshot = this.optimisticTitle();
    this.optimisticTitle.set(title);
    this.optimisticPending.set(true);
    try {
      await firstValueFrom(this.http.put<DemoProduct>(`${API_BASE_URL}/products/1`, { title }));
      // Settled: let the server's own value take over again.
      this.optimisticTitle.set(null);
      this.cache.invalidate(queryKeys.products.detail(1));
    } catch (error) {
      this.optimisticTitle.set(snapshot);
      throw error;
    } finally {
      this.optimisticPending.set(false);
    }
  }
}
