import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { AuthStore } from '../../../core/auth/auth-store';
import { downloadLogs } from '../../../core/errors/error-logger';

import type { ChannelView } from './channel-view';
import type { ErrorLogLevel } from '../../../core/errors/error-log.types';

const LEVELS: (ErrorLogLevel | 'all')[] = ['all', 'error', 'warning', 'info', 'debug'];

/**
 * Counts, filters and export controls, shared by all three tabs — so a filter
 * or export format added here reaches every channel at once.
 *
 * Export writes what is currently *filtered*, not the whole log: the file
 * should match what the operator is looking at.
 */
@Component({
  selector: 'app-error-log-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  template: `
    <div class="toolbar">
      <div class="toolbar__counts">
        @for (entry of countEntries(); track entry.level) {
          <span class="toolbar__chip" [class]="'toolbar__chip--' + entry.level">
            {{ entry.level }}: {{ entry.count }}
          </span>
        }
        <span class="toolbar__chip">showing {{ view().filtered().length }}</span>
      </div>

      <div class="toolbar__controls">
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="toolbar__search">
          <mat-label>Search</mat-label>
          <input
            matInput
            type="search"
            [value]="view().search()"
            (input)="view().search.set($any($event.target).value)"
            placeholder="Message, endpoint, file…"
          />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="toolbar__level">
          <mat-label>Level</mat-label>
          <mat-select
            [value]="view().level()"
            (selectionChange)="view().level.set($any($event).value)"
          >
            @for (option of levels; track option) {
              <mat-option [value]="option">{{ option }}</mat-option>
            }
          </mat-select>
        </mat-form-field>

        <mat-slide-toggle
          [checked]="view().grouped()"
          (change)="view().grouped.set($any($event).checked)"
        >
          Group duplicates
        </mat-slide-toggle>

        <button mat-stroked-button type="button" (click)="view().refresh()">
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>

        <button mat-stroked-button type="button" (click)="exportLogs('log')">
          <mat-icon>download</mat-icon>
          Export
        </button>

        <!--
          Clearing destroys evidence someone else may still need, so it is gated
          on its own capability rather than on being able to read the log.
        -->
        @if (canManage()) {
          <button
            mat-stroked-button
            type="button"
            [disabled]="view().entries().length === 0"
            (click)="view().clearChannel()"
          >
            <mat-icon>delete_sweep</mat-icon>
            Clear {{ channelLabel() }}
          </button>
        }
      </div>
    </div>
  `,
  styles: `
    :host { display: block; margin-bottom: 12px; }
    .toolbar { display: flex; flex-direction: column; gap: 12px; }
    .toolbar__counts, .toolbar__controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .toolbar__controls { gap: 12px; }
    .toolbar__chip {
      padding: 2px 10px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-small);
    }
    .toolbar__chip--error {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .toolbar__chip--warning {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .toolbar__search { min-width: 260px; }
    .toolbar__level { width: 140px; }
  `,
})
export class ErrorLogToolbar {
  private readonly auth = inject(AuthStore);

  readonly view = input.required<ChannelView>();
  readonly channelLabel = input('channel');

  protected readonly levels = LEVELS;

  protected readonly canManage = computed(() => this.auth.has('diagnostics:manage'));

  protected readonly countEntries = computed(() =>
    Object.entries(this.view().counts()).map(([level, count]) => ({ level, count })),
  );

  protected exportLogs(format: 'log' | 'json'): void {
    downloadLogs(format, this.view().filtered());
  }
}
