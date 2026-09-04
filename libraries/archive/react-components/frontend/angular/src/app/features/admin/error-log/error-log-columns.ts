import type { ErrorLogEntry } from '../../../core/errors/error-log.types';

/**
 * One column, as data.
 *
 * React's version rendered each cell with a `(entry) => ReactNode` callback.
 * That does not port cleanly — a function cannot return an Angular template —
 * so a column instead declares *what kind* of cell it is and how to read its
 * text. The table renders the four kinds.
 *
 * This turns out to be the better shape regardless: a column is now plain data
 * with no rendering logic in it, so it is trivially testable and could be
 * serialised if columns ever became configurable.
 */
export interface ErrorLogColumn {
  key: string;
  label: string;
  align?: 'left' | 'right';
  /** `mono` for identifiers and payloads, the rest render as chips. */
  kind?: 'text' | 'mono' | 'level' | 'severity';
  /** Must be total — every field on an entry can be null. */
  value: (entry: ErrorLogEntry) => string;
  tooltip?: (entry: ErrorLogEntry) => string | null;
}

/** Columns every channel shows. Tabs append their own. */
export const COMMON_COLUMNS: ErrorLogColumn[] = [
  {
    key: 'dateTime',
    label: 'Date / time',
    kind: 'mono',
    value: (entry) => new Date(entry.dateTime).toLocaleString(),
  },
  { key: 'level', label: 'Level', kind: 'level', value: (entry) => entry.level },
  { key: 'severity', label: 'Severity', kind: 'severity', value: (entry) => entry.severity },
];

/** Renders a nullable field without ever printing "null" or "undefined". */
export function orDash(value: string | number | null | undefined): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}
