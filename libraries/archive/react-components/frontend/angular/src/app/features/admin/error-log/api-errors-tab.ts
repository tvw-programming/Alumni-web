import { ChangeDetectionStrategy, Component } from '@angular/core';

import { COMMON_COLUMNS, orDash } from './error-log-columns';
import { ErrorLogTable } from './error-log-table';
import { ErrorLogToolbar } from './error-log-toolbar';
import { channelView } from './channel-view';

import type { ErrorLogColumn } from './error-log-columns';

const COLUMNS: ErrorLogColumn[] = [
  ...COMMON_COLUMNS,
  { key: 'method', label: 'Method', kind: 'mono', value: (e) => orDash(e.httpMethod) },
  { key: 'endpoint', label: 'Endpoint', kind: 'mono', value: (e) => orDash(e.apiEndpoint) },
  { key: 'status', label: 'Status', align: 'right', kind: 'mono', value: (e) => orDash(e.status) },
  {
    key: 'duration',
    label: 'Duration',
    align: 'right',
    kind: 'mono',
    value: (e) => (e.durationMs == null ? '—' : `${String(e.durationMs)}ms`),
  },
  { key: 'error', label: 'Error', kind: 'mono', value: (e) => e.error },
  {
    key: 'description',
    label: 'Description',
    value: (e) => e.errorDescription,
    tooltip: (e) =>
      e.correlationId
        ? `correlation ${e.correlationId} · ${JSON.stringify(e.context ?? {})}`
        : null,
  },
];

/**
 * Failed HTTP requests only.
 *
 * Every entry here is written by the single capture point in
 * `core/http/api-telemetry.ts`, so this tab reflects the transport layer
 * exactly — no request can fail without appearing. Cancelled requests are
 * excluded: aborting an in-flight request is normal operation, not a failure.
 */
@Component({
  selector: 'app-api-errors-tab',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ErrorLogTable, ErrorLogToolbar],
  template: `
    <p class="tab__lede">
      Every non-2xx response, network failure and timeout, with the endpoint, status, duration and
      correlation ID of the request that produced it.
    </p>

    <app-error-log-toolbar [view]="view" channelLabel="API" />

    <app-error-log-table
      [entries]="view.rows()"
      [columns]="columns"
      [countByFingerprint]="view.countByFingerprint()"
      caption="Failed API requests, newest first"
      emptyMessage="No API failures recorded. The API Call Examples page has a standard-error scenario that produces one."
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
export class ApiErrorsTab {
  protected readonly view = channelView('api');
  protected readonly columns = COLUMNS;
}
