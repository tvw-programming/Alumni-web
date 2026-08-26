import { ChangeDetectionStrategy, Component } from '@angular/core';

import { COMMON_COLUMNS, orDash } from './error-log-columns';
import { ErrorLogTable } from './error-log-table';
import { ErrorLogToolbar } from './error-log-toolbar';
import { channelView } from './channel-view';

import type { ErrorLogColumn } from './error-log-columns';
import type { ErrorLogEntry } from '../../../core/errors/error-log.types';

/** `context.kind` is what each capture point stamps; surface it as the source. */
function sourceOf(entry: ErrorLogEntry): string {
  const kind = entry.context?.['kind'];
  return typeof kind === 'string' ? kind : 'app';
}

const COLUMNS: ErrorLogColumn[] = [
  ...COMMON_COLUMNS,
  { key: 'source', label: 'Source', kind: 'mono', value: sourceOf },
  {
    key: 'file',
    label: 'File',
    kind: 'mono',
    value: (e) => `${e.fileName}${e.lineNumber == null ? '' : `:${String(e.lineNumber)}`}`,
  },
  { key: 'route', label: 'Route', kind: 'mono', value: (e) => orDash(e.route) },
  { key: 'error', label: 'Error', kind: 'mono', value: (e) => e.error },
  {
    key: 'description',
    label: 'Description',
    value: (e) => e.errorDescription,
    tooltip: (e) =>
      e.breadcrumbs?.length
        ? `trail: ${e.breadcrumbs.map((b) => `${b.category}:${b.message}`).join(' > ')}`
        : JSON.stringify(e.context ?? {}),
  },
];

/**
 * Everything that is not an HTTP failure: uncaught exceptions, rejected
 * promises, console errors, guard denials, form validation blocks and
 * component-level failures.
 *
 * The `Source` column is what makes this tab usable — one channel holding six
 * kinds of event is only navigable if each entry says which kind it is.
 */
@Component({
  selector: 'app-app-errors-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorLogTable, ErrorLogToolbar],
  template: `
    <p class="tab__lede">
      Application-level events: uncaught exceptions, unhandled rejections, console errors, denied
      route access and blocked form submissions, each tagged with the capture point that recorded
      it.
    </p>

    <app-error-log-toolbar [view]="view" channelLabel="application" />

    <app-error-log-table
      [entries]="view.rows()"
      [columns]="columns"
      [countByFingerprint]="view.countByFingerprint()"
      caption="Application errors, newest first"
      emptyMessage="No application errors recorded."
    />
  `,
  styles: `
    :host { display: block; }
    .tab__lede {
      margin: 0 0 12px;
      max-width: 90ch;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-medium);
    }
  `,
})
export class AppErrorsTab {
  protected readonly view = channelView('app');
  protected readonly columns = COLUMNS;
}
