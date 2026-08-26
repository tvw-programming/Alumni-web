import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { ErrorLogColumn } from './errorLogColumns';
import type { ErrorLogEntry } from '@/types/errorLog';

interface ErrorLogTableProps {
  entries: readonly ErrorLogEntry[];
  columns: readonly ErrorLogColumn[];
  /** Occurrence count per fingerprint; renders a `×N` chip when grouped. */
  countByFingerprint?: ReadonlyMap<string, number>;
  emptyMessage: string;
}

/** Read-only table shared by every channel tab. */
export function ErrorLogTable({
  entries,
  columns,
  countByFingerprint,
  emptyMessage,
}: ErrorLogTableProps) {
  const columnCount = columns.length + (countByFingerprint ? 1 : 0);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: '60vh' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            {countByFingerprint && <TableCell align="right">Count</TableCell>}
            {columns.map((column) => (
              <TableCell key={column.key} align={column.align ?? 'left'}>
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={columnCount} align="center" sx={{ py: 4 }}>
                <Typography color="text.secondary">{emptyMessage}</Typography>
              </TableCell>
            </TableRow>
          )}

          {entries.map((entry) => (
            <TableRow key={entry.id} hover>
              {countByFingerprint && (
                <TableCell align="right">
                  <Tooltip title={`fingerprint ${entry.fingerprint}`}>
                    <Chip
                      size="small"
                      label={`×${String(countByFingerprint.get(entry.fingerprint) ?? 1)}`}
                    />
                  </Tooltip>
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align ?? 'left'}>
                  {column.render(entry)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
