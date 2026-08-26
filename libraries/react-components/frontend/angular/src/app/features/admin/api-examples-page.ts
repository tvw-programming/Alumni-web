import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ApiExamplesService, Run } from './api-examples.service';
import { ApiScenarioCard } from '../../shared/api/api-scenario-card';
import { SchedulerCard } from './scheduler-card';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { ApiScenarioStatus } from '../../shared/api/api-scenario-card';
import type { DemoProduct } from '../products/demo-product.types';
import type { RunStatus } from './api-examples.service';

/**
 * API Call Examples — thirteen runnable request patterns.
 *
 * Each card owns a `Run`, which is status + value + error as signals. The
 * React page used a TanStack mutation per card for the same job; what a
 * scenario card actually needs is far less than a mutation provides, and
 * writing it out removed the dependency without losing anything.
 *
 * Scenario 13 lives in its own component — see `scheduler-card.ts` for why.
 */
@Component({
  selector: 'app-api-examples-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiScenarioCard, MatButtonModule, MatProgressSpinnerModule, SchedulerCard],
  providers: [ApiExamplesService],
  template: `
    <div class="examples">
      <header>
        <h1 class="examples__title">API Call Examples</h1>
        <p class="examples__lede">
          Thirteen runnable patterns over the same typed services, interceptor and normalised error
          contract. Every transport detail stays below this page.
        </p>
      </header>

      <div class="examples__grid">
        <app-api-scenario-card
          title="1. Plain API call"
          description="One typed service call. The component never sees HttpClient."
          icon="cloud_download"
          [status]="statusOf(plain)"
          [result]="plainResult()"
          [error]="errorOf(plain)"
          (run)="runPlain()"
        />

        <app-api-scenario-card
          title="2. API call with retry"
          description="Three bounded attempts with exponential backoff. Opt-in, because retrying a write can duplicate it."
          icon="cached"
          [status]="statusOf(retry)"
          [result]="titleOf(retry)"
          [error]="errorOf(retry)"
          (run)="runRetry()"
        />

        <app-api-scenario-card
          title="3. Parallel API calls"
          description="DemoProduct, user and todo start together and settle as one."
          icon="call_split"
          [status]="statusOf(parallel)"
          [result]="parallelResult()"
          [error]="errorOf(parallel)"
          (run)="runParallel()"
        />

        <app-api-scenario-card
          title="4. Sequential API calls"
          description="Independent requests, deliberately awaited in order."
          icon="account_tree"
          [status]="statusOf(sequential)"
          [result]="sequentialResult()"
          [error]="errorOf(sequential)"
          (run)="runSequential()"
        />

        <app-api-scenario-card
          title="5. Sequential dependent calls"
          description="The second request cannot be built until the first returns its category."
          icon="linear_scale"
          [status]="statusOf(dependent)"
          [result]="dependentResult()"
          [error]="errorOf(dependent)"
          (run)="runDependent()"
        />

        <app-api-scenario-card
          title="6. Fullscreen spinner"
          description="A blocking overlay driven by this page's own request state."
          icon="fullscreen"
          [status]="statusOf(fullscreen)"
          [result]="titleOf(fullscreen)"
          [error]="errorOf(fullscreen)"
          (run)="runFullscreen()"
        />

        <app-api-scenario-card
          title="7. Icon spinner"
          description="Compact progress inside the action button, for a non-blocking request."
          icon="autorenew"
          [status]="statusOf(iconSpinner)"
          [result]="titleOf(iconSpinner)"
          [error]="errorOf(iconSpinner)"
          (run)="runIconSpinner()"
        />

        <app-api-scenario-card
          title="8. API call with snackbar"
          description="The caller decides when a success is worth telling the user about."
          icon="notifications_active"
          [status]="statusOf(withSnackbar)"
          [result]="titleOf(withSnackbar)"
          [error]="errorOf(withSnackbar)"
          (run)="runWithSnackbar()"
        />

        <app-api-scenario-card
          title="9. Standard error handling"
          description="A missing resource, shown as the normalised, user-safe message."
          icon="error_outline"
          [status]="statusOf(expectedError)"
          [result]="titleOf(expectedError)"
          [error]="errorOf(expectedError)"
          (run)="runExpectedError()"
        />

        <app-api-scenario-card
          title="10. API call with a store"
          description="Run history lives in a service signal; server data stays with the resource."
          icon="storage"
          [status]="statusOf(withStore)"
          [result]="storeResult()"
          [error]="errorOf(withStore)"
          (run)="runWithStore()"
        >
          <div scenario-action>
            <button
              mat-stroked-button
              type="button"
              [disabled]="service.runs().length === 0"
              (click)="service.clearRuns()"
            >
              Clear store
            </button>
          </div>
        </app-api-scenario-card>

        <app-api-scenario-card
          title="11. API call with localStorage"
          description="The result is persisted explicitly, through the guarded storage helper."
          icon="save"
          [status]="statusOf(withStorage)"
          [result]="service.savedResult()"
          [error]="errorOf(withStorage)"
          (run)="runWithStorage()"
        >
          <div scenario-action>
            <button
              mat-stroked-button
              type="button"
              [disabled]="!service.savedResult()"
              (click)="service.removeSavedResult()"
            >
              Remove saved value
            </button>
          </div>
        </app-api-scenario-card>

        <app-api-scenario-card
          title="12. Background, non-blocking call"
          description="Warms the cache while the page stays fully interactive."
          icon="cloud_sync"
          [status]="backgroundStatus()"
          [result]="backgroundResult()"
          (run)="runBackground()"
        />

        <app-scheduler-card />
      </div>
    </div>

    @if (fullscreen.status() === 'pending') {
      <!--
        aria-live so the block is announced; a purely visual overlay leaves a
        screen-reader user with a frozen page and no explanation.
      -->
      <div class="overlay" role="alert" aria-live="assertive">
        <mat-spinner diameter="48" />
        <p>Loading fullscreen example…</p>
      </div>
    }
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .examples { display: flex; flex-direction: column; gap: 24px; }
    .examples__title {
      margin: 0;
      font: var(--mat-sys-headline-small);
      font-weight: 700;
    }
    .examples__lede {
      margin: 8px 0 0;
      max-width: 80ch;
      color: var(--mat-sys-on-surface-variant);
    }
    .examples__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 24px;
      align-items: start;
    }
    .overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 16px;
      background: color-mix(in srgb, var(--mat-sys-scrim) 60%, transparent);
      color: var(--mat-sys-inverse-surface);
    }
  `,
})
export class ApiExamplesPage {
  protected readonly service = inject(ApiExamplesService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly plain = new Run<DemoProduct>();
  protected readonly retry = new Run<DemoProduct>();
  protected readonly parallel = new Run<number>();
  protected readonly sequential = new Run<string>();
  protected readonly dependent = new Run<{ category: string; count: number }>();
  protected readonly fullscreen = new Run<DemoProduct>();
  protected readonly iconSpinner = new Run<DemoProduct>();
  protected readonly withSnackbar = new Run<DemoProduct>();
  protected readonly expectedError = new Run<DemoProduct>();
  protected readonly withStore = new Run<DemoProduct>();
  protected readonly withStorage = new Run<DemoProduct>();

  protected readonly backgroundStatus = signal<ApiScenarioStatus>('idle');
  protected readonly backgroundResult = signal<string | null>(null);

  // ---- Shared card readers ----------------------------------------------

  protected statusOf(run: { status: () => RunStatus }): ApiScenarioStatus {
    return run.status();
  }

  protected errorOf(run: { error: () => unknown }): string | null {
    const error = run.error();
    return error ? getUserMessage(normalizeError(error)) : null;
  }

  protected titleOf(run: { value: () => DemoProduct | null }): string | null {
    return run.value()?.title ?? null;
  }

  // ---- Results ----------------------------------------------------------

  protected readonly plainResult = computed(() => {
    const product = this.plain.value();
    return product ? `${product.title} — $${String(product.price)}` : null;
  });

  protected readonly parallelResult = computed(() => {
    const count = this.parallel.value();
    return count === null ? null : `DemoProduct, user and todo completed (${String(count)} results).`;
  });

  protected readonly sequentialResult = computed(() => this.sequential.value());

  protected readonly dependentResult = computed(() => {
    const value = this.dependent.value();
    return value ? `${value.category}: ${String(value.count)} related products` : null;
  });

  protected readonly storeResult = computed(() => {
    const runs = this.service.runs();
    const latest = runs[0];
    return latest ? `${String(runs.length)} run(s); latest: ${latest.summary}` : null;
  });

  // ---- Actions ----------------------------------------------------------

  protected runPlain(): void {
    void this.plain.execute(() => this.service.product(1));
  }

  protected runRetry(): void {
    void this.retry.execute(() => this.service.productWithRetry(2));
  }

  protected runParallel(): void {
    void this.parallel.execute(async () => (await this.service.parallel()).length);
  }

  protected runSequential(): void {
    void this.sequential.execute(async () => {
      const { product, user, todo } = await this.service.sequential();
      return `${product.title} → ${user.firstName} → ${todo.todo}`;
    });
  }

  protected runDependent(): void {
    void this.dependent.execute(() => this.service.dependent());
  }

  protected runFullscreen(): void {
    void this.fullscreen.execute(() => this.service.slowProduct(6));
  }

  protected runIconSpinner(): void {
    void this.iconSpinner.execute(() => this.service.slowProduct(7));
  }

  protected async runWithSnackbar(): Promise<void> {
    const product = await this.withSnackbar.execute(() => this.service.product(8));
    if (product) this.snackbar.success(`Loaded ${product.title}`);
  }

  protected runExpectedError(): void {
    // DemoProduct 0 does not exist — the failure is the point of the scenario.
    void this.expectedError.execute(() => this.service.product(0));
  }

  protected async runWithStore(): Promise<void> {
    const product = await this.withStore.execute(() => this.service.product(10));
    if (product) {
      this.service.recordRun({
        label: 'Store request',
        completedAt: new Date().toISOString(),
        summary: product.title,
      });
    }
  }

  protected async runWithStorage(): Promise<void> {
    const product = await this.withStorage.execute(() => this.service.product(11));
    if (product) this.service.saveResult(product);
  }

  protected async runBackground(): Promise<void> {
    this.backgroundStatus.set('pending');
    try {
      const product = await this.service.product(12);
      this.backgroundResult.set(`${product.title} is loaded and ready.`);
      this.backgroundStatus.set('success');
      this.snackbar.info('Background load completed');
    } catch {
      this.backgroundStatus.set('error');
    }
  }
}
