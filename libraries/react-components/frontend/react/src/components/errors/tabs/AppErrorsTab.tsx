import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import { commonColumns, type ErrorLogColumn } from '../errorLogColumns';
import { ErrorLogTable } from '../ErrorLogTable';
import { ErrorLogToolbar } from '../ErrorLogToolbar';
import { Mono } from '../Mono';
import { useErrorLog } from '../useErrorLog';

import type { ErrorLogEntry } from '@/types/errorLog';

/** `context.kind` is what each capture point stamps; surface it as the source. */
function sourceOf(entry: ErrorLogEntry): string {
  const kind = entry.context?.kind;
  return typeof kind === 'string' ? kind : 'app';
}

const columns: ErrorLogColumn[] = [
  ...commonColumns,
  {
    key: 'source',
    label: 'Source',
    render: (e) => <Mono>{sourceOf(e)}</Mono>,
  },
  {
    key: 'file',
    label: 'File',
    render: (e) => (
      <Mono>
        {e.fileName}
        {e.lineNumber != null ? `:${String(e.lineNumber)}` : ''}
      </Mono>
    ),
  },
  {
    key: 'route',
    label: 'Route',
    render: (e) => <Mono>{e.route ?? '—'}</Mono>,
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
          e.breadcrumbs?.length
            ? `trail: ${e.breadcrumbs.map((b) => `${b.category}:${b.message}`).join(' > ')}`
            : JSON.stringify(e.context ?? {})
        }
      >
        <span>{e.errorDescription}</span>
      </Tooltip>
    ),
  },
];

/**
 * Everything the running app produced that is not a request failure: render
 * crashes caught by the error boundary, route/loader failures, uncaught runtime
 * errors, unhandled promise rejections, failed chunk loads, mirrored
 * `console.error` output, and connectivity loss.
 */
export function AppErrorsTab() {
  const log = useErrorLog('app');
  const [grouped, setGrouped] = useState(true);

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
        Render crashes, route and loader failures, uncaught errors, unhandled rejections, chunk-load
        failures, mirrored <code>console.error</code> output and offline events. Grouped by
        fingerprint by default, so one recurring fault reads as one row.
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
        channelLabel="app"
      />

      <ErrorLogTable
        entries={rows}
        columns={columns}
        countByFingerprint={grouped ? counts : undefined}
        emptyMessage="No app errors recorded. Trigger a render error or navigate to an unknown route to generate one."
      />
    </Stack>
  );
}
