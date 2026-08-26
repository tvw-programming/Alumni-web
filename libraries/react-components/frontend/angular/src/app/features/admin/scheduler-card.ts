import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ApiExamplesService, Run } from './api-examples.service';
import { ApiScenarioCard } from '../../shared/api/api-scenario-card';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { ApiScenarioStatus } from '../../shared/api/api-scenario-card';
import type { DemoProduct } from '../products/demo-product.types';

const INTERVAL_MS = 10_000;

/**
 * Scenario 13 — a polling request on a 10-second tick.
 *
 * ## Why this is its own component, and why nothing flickers
 *
 * The React version of this card flickered on every tick: the whole page
 * re-rendered, and because the card dropped to a `pending` status while
 * refetching, its result text and buttons unmounted and remounted ten seconds
 * apart. The fix there was to keep the card in `success` across background
 * refetches and to isolate the polling state in this component.
 *
 * Angular gets the isolation for free — a signal written here notifies only the
 * views that read it, so the rest of the page is untouched. The second half is
 * still a deliberate choice: `status` below reports `pending` **only** for the
 * very first load. Later ticks leave the card in `success` so the timestamp
 * updates in place rather than the card being torn down and rebuilt.
 */
@Component({
  selector: 'app-scheduler-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiScenarioCard, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <app-api-scenario-card
      title="13. Internal scheduler"
      description="A 10-second interval models browser polling; it stops when this card is destroyed."
      icon="schedule"
      [status]="status()"
      [actionLabel]="running() ? 'Refresh now' : 'Start scheduler'"
      [result]="result()"
      [error]="errorText()"
      (run)="onRun()"
    >
      @if (staleWarning()) {
        <p class="scheduler__warning">{{ staleWarning() }}</p>
      }

      <div scenario-action class="scheduler__actions">
        @if (running()) {
          <button mat-stroked-button type="button" (click)="stop()">Stop scheduler</button>
        } @else {
          <span class="scheduler__chip">Stopped</span>
        }
        <!--
          A fixed-size slot for the refresh indicator. Without it the spinner
          appearing and disappearing would resize the row every ten seconds —
          which is the flicker this card exists to avoid.
        -->
        <span class="scheduler__indicator">
          @if (run.isRefreshing()) {
            <mat-spinner diameter="14" aria-label="Refreshing scheduled result" />
          }
        </span>
      </div>
    </app-api-scenario-card>
  `,
  styles: `
    :host { display: block; }
    .scheduler__actions { display: flex; align-items: center; gap: 8px; }
    .scheduler__indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      width: 16px;
      height: 16px;
    }
    .scheduler__chip {
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-small);
    }
    .scheduler__warning {
      margin: 8px 0 0;
      color: var(--mat-sys-tertiary);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class SchedulerCard {
  private readonly service = inject(ApiExamplesService);

  protected readonly run = new Run<{ product: DemoProduct; at: string }>();
  protected readonly running = signal(false);

  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Polling that outlives its component is a leak that keeps hitting the
    // server for a page nobody is looking at.
    inject(DestroyRef).onDestroy(() => {
      this.stop();
    });
  }

  /**
   * `pending` only on the first load. A background tick keeps the card in
   * `success`, so the result text updates without the card's contents being
   * removed and re-added.
   */
  protected readonly status = computed<ApiScenarioStatus>(() => {
    const state = this.run.status();
    if (state === 'pending') return this.run.value() === null ? 'pending' : 'success';
    if (state === 'error') return this.run.value() === null ? 'error' : 'success';
    return state;
  });

  protected readonly result = computed(() => {
    const value = this.run.value();
    return value ? `${value.product.title}; updated ${value.at}` : null;
  });

  protected readonly errorText = computed(() =>
    // A failure with no previous result is the card's error state; a failure
    // *after* one is reported as the warning below instead.
    this.run.value() === null && this.run.error() ? message(this.run.error()) : null,
  );

  protected readonly staleWarning = computed(() => {
    if (this.run.value() === null || !this.run.error()) return null;
    return `Last refresh failed: ${message(this.run.error()) ?? ''} Showing the previous result until the next tick.`;
  });

  protected onRun(): void {
    if (this.running()) {
      void this.tick();
      return;
    }
    this.running.set(true);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), INTERVAL_MS);
  }

  protected stop(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running.set(false);
  }

  private async tick(): Promise<void> {
    await this.run.execute(async () => ({
      product: await this.service.product(13),
      at: new Date().toLocaleTimeString(),
    }));
  }
}

function message(error: unknown): string | null {
  return error ? getUserMessage(normalizeError(error)) : null;
}
