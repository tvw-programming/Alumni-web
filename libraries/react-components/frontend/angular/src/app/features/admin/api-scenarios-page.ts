import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { ApiScenarioCard } from '../../shared/api/api-scenario-card';
import { ApiScenariosService } from './api-scenarios.service';
import { GenericCard } from '../../shared/generic-card/generic-card';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { ApiScenarioStatus } from '../../shared/api/api-scenario-card';

/**
 * API Call Scenarios — the architecture overview plus three focused demos.
 *
 * The React page documents a TanStack Query stack. This one documents what
 * replaced it, so the descriptions are rewritten rather than copied: claiming
 * "hierarchical keys and bounded retries" here would describe a library the app
 * no longer uses. See `api-scenarios.service.ts` for the mapping.
 */
@Component({
  selector: 'app-api-scenarios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiScenarioCard, GenericCard, MatButtonModule, MatChipsModule],
  providers: [ApiScenariosService],
  template: `
    <div class="scenarios">
      <header>
        <h1 class="scenarios__title">API Call Scenarios</h1>
        <p class="scenarios__lede">
          The UI reads typed signal state while the HTTP client, headers, correlation IDs,
          cancellation and error normalisation stay below the component layer.
        </p>
      </header>

      <div class="scenarios__grid scenarios__grid--three">
        <app-generic-card title="HTTP client" icon="security">
          <p class="scenarios__body">
            One <code>HttpInterceptorFn</code> stamps headers, times every request and logs each
            failure exactly once as a normalised error.
          </p>
          <p class="scenarios__body">
            Internal headers go only to our own origin — a custom header on a third-party GET
            forces a preflight that its server never allows, and a bearer token sent to a host we
            do not control is a leaked credential.
          </p>
        </app-generic-card>

        <app-generic-card title="Data layer" icon="data_object">
          <p class="scenarios__body">
            <code>httpResource</code> exposes value, loading and error as signals. Its request
            function is reactive, so reading a filter inside it is what makes the request re-issue
            — there is no key to keep in sync.
          </p>
          <p class="scenarios__body">
            <code>httpResource</code> has no invalidation of its own, so a small
            <code>QueryCache</code> holds a version per key; bumping one changes the request
            identity and Angular refetches.
          </p>
        </app-generic-card>

        <app-generic-card title="What changed from React" icon="compare_arrows" surface="subtle">
          <ul class="scenarios__list">
            <li><code>useQuery</code> → <code>httpResource</code></li>
            <li><code>useMutation</code> → an async service method plus signals</li>
            <li>query keys → a reactive request function</li>
            <li><code>invalidateQueries</code> → <code>QueryCache.invalidate</code></li>
            <li><code>AbortSignal</code> plumbing → setting a signal back to null</li>
          </ul>
        </app-generic-card>
      </div>

      <div class="scenarios__grid scenarios__grid--two">
        <app-api-scenario-card
          title="Typed pagination"
          description="The request function reads the page signal, so changing it re-issues the request."
          icon="auto_stories"
          [status]="pageStatus()"
          [result]="pageResult()"
          [error]="pageError()"
          [runnable]="false"
        >
          <div scenario-action class="scenarios__actions">
            <button mat-stroked-button type="button" [disabled]="service.page() === 0" (click)="service.previousPage()">
              Previous
            </button>
            <button mat-stroked-button type="button" [disabled]="!hasNextPage()" (click)="service.nextPage()">
              Next
            </button>
          </div>
        </app-api-scenario-card>

        <app-api-scenario-card
          title="Abort and manual cancellation"
          description="A 4-second request that can be cancelled mid-flight by clearing the signal it depends on."
          icon="cancel"
          actionLabel="Start delayed call"
          [status]="delayedStatus()"
          [result]="delayedResult()"
          [error]="delayedError()"
          (run)="service.startDelayed()"
        >
          <div scenario-action>
            <button
              mat-stroked-button
              type="button"
              [disabled]="!service.delayed.isLoading()"
              (click)="cancel()"
            >
              Cancel request
            </button>
          </div>
        </app-api-scenario-card>

        <app-api-scenario-card
          title="Optimistic update"
          description="Shows the new title at once, then restores the previous one if the request fails."
          icon="sync"
          actionLabel="Rename optimistically"
          [status]="optimisticStatus()"
          [result]="optimisticResult()"
          [error]="optimisticError()"
          (run)="rename()"
        />
      </div>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .scenarios { display: flex; flex-direction: column; gap: 24px; }
    .scenarios__title {
      margin: 0;
      font: var(--mat-sys-headline-small);
      font-weight: 700;
    }
    .scenarios__lede {
      margin: 8px 0 0;
      max-width: 80ch;
      color: var(--mat-sys-on-surface-variant);
    }
    .scenarios__grid { display: grid; gap: 24px; align-items: start; }
    .scenarios__grid--three { grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); }
    .scenarios__grid--two { grid-template-columns: repeat(auto-fit, minmax(380px, 1fr)); }
    .scenarios__body {
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .scenarios__list {
      margin: 0;
      padding-left: 20px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .scenarios__list li { margin-bottom: 4px; }
    .scenarios__actions { display: flex; gap: 8px; }
  `,
})
export class ApiScenariosPage {
  protected readonly service = inject(ApiScenariosService);
  private readonly snackbar = inject(SnackbarService);

  // ---- Pagination --------------------------------------------------------

  protected readonly pageStatus = computed<ApiScenarioStatus>(() =>
    status(this.service.productPage.isLoading(), this.service.productPage.error() !== undefined,
      this.service.productPage.value() !== undefined),
  );

  protected readonly pageResult = computed(() => {
    const value = this.service.productPage.value();
    if (!value) return null;
    const titles = value.products.map((product) => product.title).join(', ');
    return `Page ${String(this.service.page() + 1)}: ${titles}`;
  });

  protected readonly pageError = computed(() => message(this.service.productPage.error()));

  protected readonly hasNextPage = computed(() => {
    const value = this.service.productPage.value();
    return value ? value.skip + value.limit < value.total : false;
  });

  // ---- Cancellation ------------------------------------------------------

  protected readonly delayedStatus = computed<ApiScenarioStatus>(() =>
    status(this.service.delayed.isLoading(), this.service.delayed.error() !== undefined,
      this.service.delayed.value() !== undefined),
  );

  protected readonly delayedResult = computed(() => this.service.delayed.value()?.title ?? null);
  protected readonly delayedError = computed(() => message(this.service.delayed.error()));

  protected cancel(): void {
    this.service.cancelDelayed();
    this.snackbar.info('Request cancelled');
  }

  // ---- Optimistic update -------------------------------------------------

  protected readonly optimisticStatus = computed<ApiScenarioStatus>(() =>
    status(
      this.service.sourceProduct.isLoading() || this.service.optimisticPending(),
      this.service.sourceProduct.error() !== undefined,
      this.service.sourceProduct.value() !== undefined,
    ),
  );

  /** The local override wins while it exists; otherwise the server's value shows. */
  protected readonly optimisticResult = computed(
    () => this.service.optimisticTitle() ?? this.service.sourceProduct.value()?.title ?? null,
  );

  protected readonly optimisticError = computed(() => message(this.service.sourceProduct.error()));

  protected async rename(): Promise<void> {
    const stamp = new Date().toLocaleTimeString();
    try {
      await this.service.renameOptimistically(`Optimistic title ${stamp}`);
      this.snackbar.success('Renamed, and the server agreed');
    } catch (error) {
      this.snackbar.error(`Rename failed — reverted (${getUserMessage(normalizeError(error))})`);
    }
  }
}

function status(pending: boolean, failed: boolean, hasData: boolean): ApiScenarioStatus {
  if (pending) return 'pending';
  if (failed) return 'error';
  return hasData ? 'success' : 'idle';
}

function message(error: unknown): string | null {
  return error ? getUserMessage(normalizeError(error)) : null;
}
