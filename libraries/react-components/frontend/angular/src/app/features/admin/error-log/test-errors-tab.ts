import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AuthStore } from '../../../core/auth/auth-store';
import { IS_DEV } from '../../../core/config/app-config';
import { SnackbarService } from '../../../shared/snackbar/snackbar.service';

import type { TestReport } from '../../../core/errors/test-report.types';

/**
 * Served by the dev-only runner sidecar, which reads
 * `.test-output/test-report.json`. Not a static asset: writing into `public/`
 * made the dev server reload the page mid-run.
 */
const REPORT_URL = '/test-report.json';

/** The dev-only endpoint; see `tools/test-runner-server.mjs`. */
const RUN_ENDPOINT = '/__run-unit-tests';

interface RunTestsResponse {
  ok: boolean;
  exitCode: number;
  durationMs: number;
  message?: string;
}

function isTestReport(value: unknown): value is TestReport {
  if (typeof value !== 'object' || value === null) return false;
  const report = value as Partial<TestReport>;
  return typeof report.generatedAt === 'string' && Array.isArray(report.failures);
}

/**
 * Unit test results.
 *
 * Tests run in Node, so the browser cannot observe them directly. The Vitest
 * reporter writes `.test-output/test-report.json` on every run and this tab reads it
 * — the artifact is the entire hand-off, and its type is the contract between
 * the two.
 *
 * A missing file is a normal state ("no run recorded"), not an error — which
 * is why a failed fetch renders the same guidance as a malformed report rather
 * than an alarming error panel.
 */
@Component({
  selector: 'app-test-errors-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="tests">
      <div class="tests__header">
        <p class="tests__lede">
          Written by the Vitest reporter on every run. Failures show the suite, file, message and
          diff — the same detail the terminal prints, without needing the terminal.
        </p>
        <div class="tests__actions">
          <button mat-stroked-button type="button" (click)="report.reload()">
            <mat-icon>refresh</mat-icon>
            Refresh
          </button>
          @if (canRun()) {
            <button mat-flat-button type="button" [disabled]="running()" (click)="runTests()">
              @if (running()) {
                <mat-spinner diameter="16" />
              } @else {
                <mat-icon>play_arrow</mat-icon>
              }
              {{ running() ? 'Running…' : 'Run unit tests' }}
            </button>
          }
        </div>
      </div>

      @if (runError()) {
        <p class="tests__error" role="alert">{{ runError() }}</p>
      }

      @if (report.isLoading()) {
        <p class="tests__muted">Loading the last report…</p>
      } @else if (validReport(); as result) {
        <div class="tests__summary" [class.tests__summary--failed]="result.status === 'failed'">
          <span class="tests__badge">{{ result.status }}</span>
          <span>{{ result.totals.passed }} passed</span>
          <span>{{ result.totals.failed }} failed</span>
          <span>{{ result.totals.skipped }} skipped</span>
          <span>{{ result.totals.files }} files</span>
          <span class="tests__when">
            {{ result.durationMs }}ms · {{ formatTime(result.generatedAt) }}
          </span>
        </div>

        @for (failure of result.failures; track failure.file + failure.name) {
          <article class="tests__failure">
            <header class="tests__failure-head">
              <span class="tests__badge tests__badge--error">{{ failure.errorName }}</span>
              <span class="tests__name">
                {{ failure.suite ? failure.suite + ' > ' : '' }}{{ failure.name }}
              </span>
              @if (failure.durationMs !== null) {
                <span class="tests__badge">{{ failure.durationMs }}ms</span>
              }
            </header>
            <p class="tests__file">{{ failure.file }}</p>
            <p class="tests__message">{{ failure.message }}</p>
            @if (failure.diff || failure.stack) {
              <pre class="tests__pre">{{ detailOf(failure) }}</pre>
            }
          </article>
        } @empty {
          <p class="tests__muted">
            No failures in the last run. Every one of the {{ result.totals.tests }} tests passed.
          </p>
        }

        @for (unhandled of result.unhandledErrors; track unhandled) {
          <pre class="tests__pre tests__pre--error">{{ unhandled }}</pre>
        }
      } @else {
        <p class="tests__muted">
          No test report available. Run <code>pnpm test</code> to produce one. The report is
          served by the dev runner, so this tab is populated under <code>pnpm dev</code> — under
          plain <code>pnpm start</code> there is nothing serving it.
        </p>
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .tests { display: flex; flex-direction: column; gap: 12px; }
    .tests__header {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }
    .tests__lede {
      margin: 0;
      max-width: 70ch;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .tests__actions { display: flex; gap: 8px; }
    .tests__summary {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      border-radius: 12px;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font: var(--mat-sys-body-medium);
    }
    .tests__summary--failed {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .tests__when { margin-left: auto; opacity: 0.85; }
    .tests__badge {
      padding: 1px 10px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-small);
      text-transform: uppercase;
    }
    .tests__badge--error {
      background: var(--mat-sys-error);
      color: var(--mat-sys-on-error);
    }
    .tests__failure {
      padding: 16px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
    }
    .tests__failure-head {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .tests__name {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-weight: 600;
    }
    .tests__file, .tests__message { margin: 8px 0 0; }
    .tests__file {
      color: var(--mat-sys-on-surface-variant);
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 0.8rem;
    }
    .tests__pre {
      margin: 12px 0 0;
      padding: 12px;
      border-radius: 8px;
      background: var(--mat-sys-surface-container-highest);
      font-size: 0.78rem;
      line-height: 1.6;
      /* Stack traces are wide; scroll them here, never the page. */
      overflow-x: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    .tests__pre--error { color: var(--mat-sys-error); }
    .tests__muted { margin: 0; color: var(--mat-sys-on-surface-variant); }
    .tests__error { margin: 0; color: var(--mat-sys-error); }
  `,
})
export class TestErrorsTab {
  private readonly auth = inject(AuthStore);
  private readonly snackbar = inject(SnackbarService);

  protected readonly running = signal(false);
  protected readonly runError = signal<string | null>(null);

  // `cache: no-store` matters: the point of Refresh is to see a *newer* file.
  protected readonly report = httpResource(() => ({
    url: REPORT_URL,
    headers: { 'Cache-Control': 'no-cache' },
  }));

  protected readonly validReport = computed<TestReport | null>(() => {
    const value = this.report.value();
    return isTestReport(value) ? value : null;
  });

  /**
   * Running the suite is a build action, not a read, so it needs the manage
   * capability — and the endpoint only exists under the dev server.
   */
  protected readonly canRun = computed(() => IS_DEV && this.auth.has('diagnostics:manage'));

  protected formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  protected detailOf(failure: TestReport['failures'][number]): string {
    return [failure.diff, failure.stack].filter(Boolean).join('\n\n');
  }

  protected async runTests(): Promise<void> {
    this.running.set(true);
    this.runError.set(null);
    try {
      const response = await fetch(RUN_ENDPOINT, { method: 'POST' });
      if (!response.ok) {
        throw new Error(
          `The runner endpoint returned ${String(response.status)}. It exists only under \`pnpm start\`.`,
        );
      }
      const result = (await response.json()) as RunTestsResponse;
      // The suite has rewritten the artifact by now, so re-read it.
      this.report.reload();
      if (result.ok) {
        this.snackbar.success(`Tests passed in ${String(Math.round(result.durationMs / 1000))}s`);
      } else {
        this.snackbar.error(result.message ?? 'Tests failed — see the failures below.');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.runError.set(message);
      this.snackbar.error(message);
    } finally {
      this.running.set(false);
    }
  }
}
