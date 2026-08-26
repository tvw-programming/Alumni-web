import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';

import { ApiErrorsTab } from './api-errors-tab';
import { AppErrorsTab } from './app-errors-tab';
import { ErrorLogStore } from '../../../core/errors/error-log-store';
import { TestErrorsTab } from './test-errors-tab';
import { getRelease, getSessionId } from '../../../core/errors/monitoring';

/**
 * Admin console over the error log, one tab per channel.
 *
 * The shell owns tab selection and the unread badges, nothing else. Each tab
 * owns its own filter state through `channelView`, so adding a fourth channel
 * is a new tab component plus one `<mat-tab>` — nothing here changes shape.
 *
 * Tabs are lazy (`matTabContent`): each one reads the log and, in the test
 * tab's case, fetches an artifact. Keeping all three alive would mean paying
 * for all three to show one.
 */
@Component({
  selector: 'app-error-log-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ApiErrorsTab, AppErrorsTab, MatBadgeModule, MatIconModule, MatTabsModule, TestErrorsTab],
  template: `
    <div class="console">
      <header>
        <h1 class="console__title">Error &amp; Monitoring Console</h1>
        <p class="console__lede">
          Entries are written to a rotating <code>localStorage</code> buffer (max 500) and handed to
          the monitoring sink — the console in development, the configured endpoint in production.
          Release <code>{{ release }}</code
          >, session <code>{{ sessionId }}</code
          >.
        </p>
      </header>

      <mat-tab-group animationDuration="0ms">
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="console__tab-icon">cloud_off</mat-icon>
            <span
              class="console__tab-label"
              [matBadge]="apiCount()"
              [matBadgeHidden]="apiCount() === 0"
              matBadgeColor="warn"
              matBadgeSize="small"
            >
              API calls
            </span>
          </ng-template>
          <ng-template matTabContent>
            <div class="console__panel"><app-api-errors-tab /></div>
          </ng-template>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="console__tab-icon">bug_report</mat-icon>
            <span
              class="console__tab-label"
              [matBadge]="appCount()"
              [matBadgeHidden]="appCount() === 0"
              matBadgeColor="warn"
              matBadgeSize="small"
            >
              Application
            </span>
          </ng-template>
          <ng-template matTabContent>
            <div class="console__panel"><app-app-errors-tab /></div>
          </ng-template>
        </mat-tab>

        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="console__tab-icon">science</mat-icon>
            <span>Unit tests</span>
          </ng-template>
          <ng-template matTabContent>
            <div class="console__panel"><app-test-errors-tab /></div>
          </ng-template>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .console { max-width: 1400px; }
    .console__title {
      margin: 0;
      font: var(--mat-sys-headline-small);
      font-weight: 700;
    }
    .console__lede {
      margin: 8px 0 20px;
      max-width: 90ch;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
    .console__tab-icon { margin-right: 8px; }
    /*
     * MatBadge overlays the top-right corner of its host, so a badged label
     * needs room reserved for it — without this the count sits on top of the
     * last characters of the word.
     */
    .console__tab-label { padding-right: 14px; }
    .console__panel { padding-top: 20px; }
  `,
})
export class ErrorLogPage {
  private readonly store = inject(ErrorLogStore);

  protected readonly release = getRelease();
  protected readonly sessionId = getSessionId();

  protected readonly apiCount = computed(() => this.store.channelCounts()['api'] ?? 0);
  protected readonly appCount = computed(() => this.store.channelCounts()['app'] ?? 0);
}
