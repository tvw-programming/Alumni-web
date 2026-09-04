import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { commonColumns, type ErrorLogColumn } from '../errorLogColumns';
import { ErrorLogTable } from '../ErrorLogTable';
import { ErrorLogToolbar } from '../ErrorLogToolbar';
import { Mono } from '../Mono';
import { useErrorLog } from '../useErrorLog';

const columns: ErrorLogColumn[] = [
  ...commonColumns,
  {
    key: 'method',
    label: 'Method',
    render: (e) => <Mono>{e.httpMethod ?? '—'}</Mono>,
  },
  {
    key: 'endpoint',
    label: 'Endpoint',
    render: (e) => <Mono>{e.apiEndpoint ?? '—'}</Mono>,
  },
  {
    key: 'status',
    label: 'Status',
    align: 'right',
    render: (e) => <Mono>{e.status ?? '—'}</Mono>,
  },
  {
    key: 'duration',
    label: 'Duration',
    align: 'right',
    render: (e) => <Mono>{e.durationMs != null ? `${String(e.durationMs)}ms` : '—'}</Mono>,
  },
  {
    key: 'error',
    label: 'Error',
    render: (e) => <Mono>{e.error}</Mono>,
  },
  {
    key: 'description',
    label: 'Description',
    render: (e) => (
      <Tooltip
        title={
          e.correlationId
            ? `correlation ${e.correlationId} · ${JSON.stringify(e.context ?? {})}`
            : ''
        }
      >
        <span>{e.errorDescription}</span>
      </Tooltip>
    ),
  },
];

/**
 * Failed HTTP requests only. Every entry here is written by the single capture
 * point in `api/apiTelemetry.ts`, so this tab reflects the transport layer
 * exactly — no request can fail without appearing.
 */
export function ApiErrorsTab() {
  const log = useErrorLog('api');
  const [grouped, setGrouped] = useState(false);

  const rows = useMemo(
    () => (grouped ? log.grouped.map((group) => group.entry) : log.filtered),
    [grouped, log.grouped, log.filtered],
  );
  const counts = useMemo(
    () => new Map(log.grouped.map((group) => [group.entry.fingerprint, group.count])),
    [log.grouped],
  );

  return (
    <Stack spacing={1}>
      <Typography variant="body2" color="text.secondary">
        Every non-2xx response, network failure and timeout, with the endpoint, status, duration and
        correlation ID of the request that produced it. Canceled requests are excluded — React Query
        aborts in-flight requests on unmount as normal operation.
      </Typography>

      <ErrorLogToolbar
        entries={log.entries}
        filtered={log.filtered}
        counts={log.counts}
        level={log.level}
        onLevelChange={log.setLevel}
        search={log.search}
        onSearchChange={log.setSearch}
        grouped={grouped}
        onGroupedChange={setGrouped}
        onRefresh={log.refresh}
        onClear={log.clearChannel}
        channelLabel="API"
      />

      <ErrorLogTable
        entries={rows}
        columns={columns}
        countByFingerprint={grouped ? counts : undefined}
        emptyMessage="No API failures recorded. Run a failing request — the API Call Examples page has a standard-error scenario."
      />
    </Stack>
  );
}
