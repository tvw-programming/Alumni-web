import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { API_BASE_URL } from '../../core/config/app-config';
import { safeLocalStorage } from '../../core/storage/safe-storage';

import type { DemoProduct } from '../products/demo-product.types';

export type RunStatus = 'idle' | 'pending' | 'success' | 'error';

/** One run's observable state. Every scenario on the page owns one of these. */
export interface RunState<T> {
  readonly status: () => RunStatus;
  readonly value: () => T | null;
  readonly error: () => unknown;
}

interface TodoResponse {
  todo: string;
}

interface UserResponse {
  firstName: string;
  lastName: string;
}

interface CategoryResponse {
  products: DemoProduct[];
}

export interface ScenarioRun {
  label: string;
  completedAt: string;
  summary: string;
}

const LOCAL_RESULT_KEY = 'api-scenario.last-product';

/**
 * A tiny result holder: status, value and error as signals.
 *
 * This is what replaces `useMutation` for a one-shot request. TanStack's
 * mutation object carries retry policy, cache interaction and lifecycle
 * callbacks; a scenario page needs none of that, only "what happened to the
 * last run". Writing it out is a dozen lines and removes a dependency.
 */
export class Run<T> {
  private readonly statusSignal = signal<RunStatus>('idle');
  private readonly valueSignal = signal<T | null>(null);
  private readonly errorSignal = signal<unknown>(null);

  readonly status = this.statusSignal.asReadonly();
  readonly value = this.valueSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();

  /** True only for the first load, so later refreshes do not blank the card. */
  readonly isRefreshing = computed(
    () => this.statusSignal() === 'pending' && this.valueSignal() !== null,
  );

  async execute(work: () => Promise<T>): Promise<T | null> {
    this.statusSignal.set('pending');
    this.errorSignal.set(null);
    try {
      const result = await work();
      this.valueSignal.set(result);
      this.statusSignal.set('success');
      return result;
    } catch (error) {
      this.errorSignal.set(error);
      // A failed refresh keeps the previous value on screen rather than
      // replacing a good result with an empty card.
      this.statusSignal.set('error');
      return null;
    }
  }

  reset(): void {
    this.statusSignal.set('idle');
    this.valueSignal.set(null);
    this.errorSignal.set(null);
  }
}

/**
 * The request patterns behind the API Call Examples page.
 *
 * React expressed each of these as a TanStack hook. Here they are plain async
 * methods: the orchestration being demonstrated — parallel, sequential,
 * dependent, retried — is ordinary asynchronous code, and a query library was
 * never what made it work.
 */
@Injectable()
export class ApiExamplesService {
  private readonly http = inject(HttpClient);

  private get<T>(path: string): Promise<T> {
    return firstValueFrom(this.http.get<T>(`${API_BASE_URL}${path}`));
  }

  // 1. Plain call.
  product(id: number): Promise<DemoProduct> {
    return this.get<DemoProduct>(`/products/${String(id)}`);
  }

  /**
   * 2. Bounded retries with exponential backoff.
   *
   * Retrying is deliberately not automatic anywhere else in the app: a retry on
   * a non-idempotent request can duplicate work, and a retry on a 404 only
   * wastes time. It is opt-in, here, for a GET.
   */
  async productWithRetry(id: number, attempts = 3): Promise<DemoProduct> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        return await this.product(id);
      } catch (error) {
        lastError = error;
        if (attempt < attempts - 1) {
          await delay(2 ** attempt * 300);
        }
      }
    }
    throw lastError;
  }

  // 3. Parallel — three independent requests started together.
  async parallel(): Promise<[DemoProduct, UserResponse, TodoResponse]> {
    return Promise.all([
      this.get<DemoProduct>('/products/3'),
      this.get<UserResponse>('/users/3'),
      this.get<TodoResponse>('/todos/3'),
    ]);
  }

  // 4. Sequential — independent requests, deliberately awaited in order.
  async sequential(): Promise<{ product: DemoProduct; user: UserResponse; todo: TodoResponse }> {
    const product = await this.get<DemoProduct>('/products/4');
    const user = await this.get<UserResponse>('/users/4');
    const todo = await this.get<TodoResponse>('/todos/4');
    return { product, user, todo };
  }

  /**
   * 5. Dependent — the second request cannot be built until the first returns.
   *
   * The distinction from sequential: this one *has* to wait, because the
   * category comes out of the first response.
   */
  async dependent(): Promise<{ category: string; count: number }> {
    const product = await this.get<DemoProduct>('/products/5');
    const related = await this.get<CategoryResponse>(
      `/products/category/${encodeURIComponent(product.category)}`,
    );
    return { category: product.category, count: related.products.length };
  }

  // 6, 7. A slow call, for the overlay and the in-button spinner.
  slowProduct(id: number): Promise<DemoProduct> {
    return this.get<DemoProduct>(`/products/${String(id)}?delay=1500`);
  }

  // 10. A small run history, held in the service rather than in a component.
  private readonly runsSignal = signal<ScenarioRun[]>([]);
  readonly runs = this.runsSignal.asReadonly();

  recordRun(run: ScenarioRun): void {
    this.runsSignal.update((current) => [run, ...current]);
  }

  clearRuns(): void {
    this.runsSignal.set([]);
  }

  // 11. Guarded localStorage, for a value the user chose to persist.
  readonly savedResult = signal<string | null>(safeLocalStorage.get(LOCAL_RESULT_KEY));

  saveResult(product: DemoProduct): void {
    const serialized = JSON.stringify({ id: product.id, title: product.title });
    safeLocalStorage.set(LOCAL_RESULT_KEY, serialized);
    this.savedResult.set(serialized);
  }

  removeSavedResult(): void {
    safeLocalStorage.remove(LOCAL_RESULT_KEY);
    this.savedResult.set(null);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
