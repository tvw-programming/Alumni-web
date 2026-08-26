import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

import type { ErrorLogColumn } from './error-log-columns';
import type { ErrorLogEntry } from '../../../core/errors/error-log.types';

/**
 * Read-only table shared by every channel tab.
 *
 * A plain `<table>` rather than `MatTable`: the data is already a signal, the
 * table is read-only, and `MatTable`'s value is its DataSource plumbing —
 * sorting, pagination, selection — none of which is wanted here. A semantic
 * table with `<caption>` and scoped headers is also better for screen readers
 * than what a component wrapper would produce by default.
 */
@Component({
  selector: 'app-error-log-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatTooltipModule],
  template: `
    <div class="log-table__scroll">
      <table class="log-table">
        <caption class="log-table__caption">
          {{ caption() }}
        </caption>
        <thead>
          <tr>
            @if (grouped()) {
              <th scope="col" class="log-table__num">Count</th>
            }
            @for (column of columns(); track column.key) {
              <th scope="col" [class.log-table__num]="column.align === 'right'">
                {{ column.label }}
              </th>
            }
          </tr>
        </thead>
        <tbody>
          @for (entry of entries(); track entry.id) {
            <tr>
              @if (grouped()) {
                <td class="log-table__num">
                  <span class="log-table__chip" [matTooltip]="'fingerprint ' + entry.fingerprint">
                    ×{{ occurrences(entry) }}
                  </span>
                </td>
              }
              @for (column of columns(); track column.key) {
                <td
                  [class.log-table__num]="column.align === 'right'"
                  [class.log-table__mono]="column.kind === 'mono'"
                  [matTooltip]="column.tooltip ? (column.tooltip(entry) ?? '') : ''"
                >
                  @if (column.kind === 'level' || column.kind === 'severity') {
                    <span class="log-table__chip" [class]="chipClass(column, entry)">
                      {{ column.value(entry) }}
                    </span>
                  } @else {
                    {{ column.value(entry) }}
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td class="log-table__empty" [attr.colspan]="columnCount()">
                {{ emptyMessage() }}
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host { display: block; }
    /* The table scrolls inside its own box so the page never scrolls sideways. */
    .log-table__scroll {
      max-height: 60vh;
      overflow: auto;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 12px;
      background: var(--mat-sys-surface-container-low);
    }
    .log-table {
      width: 100%;
      border-collapse: collapse;
      font: var(--mat-sys-body-small);
    }
    .log-table__caption {
      padding: 8px 12px;
      text-align: left;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-medium);
    }
    .log-table th {
      position: sticky;
      top: 0;
      z-index: 1;
      padding: 8px 12px;
      text-align: left;
      white-space: nowrap;
      background: var(--mat-sys-surface-container);
      color: var(--mat-sys-on-surface);
      font-weight: 600;
    }
    .log-table td {
      padding: 8px 12px;
      border-top: 1px solid var(--mat-sys-outline-variant);
      vertical-align: top;
      color: var(--mat-sys-on-surface);
    }
    .log-table tbody tr:hover td { background: var(--mat-sys-surface-container-highest); }
    .log-table__num { text-align: right; font-variant-numeric: tabular-nums; }
    .log-table__mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      /* Endpoints and payloads have no spaces to break at. */
      overflow-wrap: anywhere;
    }
    .log-table__empty {
      padding: 32px 12px;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }
    .log-table__chip {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 999px;
      background: var(--mat-sys-surface-container-highest);
      color: var(--mat-sys-on-surface-variant);
      white-space: nowrap;
    }
    .log-table__chip--error, .log-table__chip--fatal {
      background: var(--mat-sys-error-container);
      color: var(--mat-sys-on-error-container);
    }
    .log-table__chip--warning {
      background: var(--mat-sys-tertiary-container);
      color: var(--mat-sys-on-tertiary-container);
    }
    .log-table__chip--info {
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
    }
  `,
})
export class ErrorLogTable {
  readonly entries = input.required<readonly ErrorLogEntry[]>();
  readonly columns = input.required<readonly ErrorLogColumn[]>();
  /** Occurrence count per fingerprint; null renders the ungrouped table. */
  readonly countByFingerprint = input<ReadonlyMap<string, number> | null>(null);
  readonly emptyMessage = input('No entries.');
  readonly caption = input('Error log entries');

  protected readonly grouped = computed(() => this.countByFingerprint() !== null);

  protected readonly columnCount = computed(
    () => this.columns().length + (this.grouped() ? 1 : 0),
  );

  protected occurrences(entry: ErrorLogEntry): number {
    return this.countByFingerprint()?.get(entry.fingerprint) ?? 1;
  }

  protected chipClass(column: ErrorLogColumn, entry: ErrorLogEntry): string {
    return `log-table__chip--${column.value(entry)}`;
  }
}
