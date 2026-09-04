import Chip from '@mui/material/Chip';

import { Mono } from './Mono';

import type { ErrorLogEntry, ErrorLogLevel, ErrorSeverity } from '@/types/errorLog';
import type { ReactNode } from 'react';

/**
 * Column definitions and chip palettes shared by the channel tabs.
 *
 * Kept out of `ErrorLogTable.tsx` so that file exports a component and nothing
 * else — Fast Refresh only preserves state for modules whose exports are all
 * components.
 */

export const LEVEL_COLOR: Record<ErrorLogLevel, 'error' | 'warning' | 'info' | 'default'> = {
  error: 'error',
  warning: 'warning',
  info: 'info',
  debug: 'default',
};

export const SEVERITY_COLOR: Record<ErrorSeverity, 'error' | 'warning' | 'info'> = {
  fatal: 'error',
  error: 'error',
  warning: 'warning',
  info: 'info',
};

/**
 * One column. Tabs differ only in this list, which is why all three share a
 * single table implementation.
 */
export interface ErrorLogColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** Rendered per row. Keep it total — every field on the entry can be null. */
  render: (entry: ErrorLogEntry) => ReactNode;
}

/** Columns every channel shows. Tabs append their own. */
export const commonColumns: ErrorLogColumn[] = [
  {
    key: 'dateTime',
    label: 'Date / Time',
    render: (e) => <Mono>{new Date(e.dateTime).toLocaleString()}</Mono>,
  },
  {
    key: 'level',
    label: 'Level',
    render: (e) => <Chip size="small" color={LEVEL_COLOR[e.level]} label={e.level} />,
  },
  {
    key: 'severity',
    label: 'Severity',
    render: (e) => (
      <Chip size="small" variant="outlined" color={SEVERITY_COLOR[e.severity]} label={e.severity} />
    ),
  },
];
