import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';

import { pluralize } from '../../../foundation';

import type { ReactNode } from 'react';

export interface SortState {
  columnId: string;
  direction: 'asc' | 'desc';
}

export interface DataTableColumn<T> {
  id: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  align?: 'left' | 'right';
  /** Hidden on small screens, where the card fallback takes over. */
  primary?: boolean;
}

export interface DataTableWrapperProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  sort?: SortState;
  page?: number;
  pageSize?: number;
  total?: number;
  selectedIds?: string[];
  loading?: boolean;
  emptyMessage?: string;
  onSortChange?: (sort: SortState) => void;
  onPageChange?: (page: number) => void;
  onSelectionChange?: (ids: string[]) => void;
}

/**
 * A controlled table.
 *
 * Sort, page and selection are **all props**. Holding them internally makes the
 * URL unable to describe what is on screen, and a dashboard view that cannot be
 * linked to is a dashboard nobody shares.
 *
 * Below `md` the table becomes a list of cards. A table with eight columns on a
 * 390px screen is a horizontal scroll nobody discovers, and the mobile fallback
 * is not optional at that width.
 *
 * Sorting announces itself: a screen reader gets "sorted ascending" from
 * `aria-sort` on the header, which a click on a styled `<div>` never provides.
 */
export function DataTableWrapper<T>({
  columns,
  rows,
  rowKey,
  sort,
  page = 0,
  pageSize = 25,
  total,
  selectedIds = [],
  loading = false,
  emptyMessage = 'No results',
  onSortChange,
  onPageChange,
  onSelectionChange,
}: DataTableWrapperProps<T>) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const selectable = onSelectionChange !== undefined;
  const allSelected = rows.length > 0 && selectedIds.length === rows.length;

  const toggleAll = () => {
    onSelectionChange?.(allSelected ? [] : rows.map(rowKey));
  };

  const toggleOne = (id: string) => {
    onSelectionChange?.(
      selectedIds.includes(id) ? selectedIds.filter((entry) => entry !== id) : [...selectedIds, id],
    );
  };

  const body = isDesktop ? (
    <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {selectable ? (
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={selectedIds.length > 0 && !allSelected}
                  onChange={toggleAll}
                  inputProps={{ 'aria-label': allSelected ? 'Clear selection' : 'Select all rows' }}
                />
              </TableCell>
            ) : null}

            {columns.map((column) => {
              const active = sort?.columnId === column.id;
              return (
                <TableCell
                  key={column.id}
                  align={column.align}
                  // `aria-sort` is what makes the sort audible. A click handler
                  // on a styled div never provides it.
                  aria-sort={
                    active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                >
                  {column.sortable === true && onSortChange ? (
                    <TableSortLabel
                      active={active}
                      direction={active ? sort.direction : 'asc'}
                      IconComponent={
                        active && sort.direction === 'desc' ? ArrowDownwardIcon : ArrowUpwardIcon
                      }
                      onClick={() => {
                        onSortChange({
                          columnId: column.id,
                          direction: active && sort.direction === 'asc' ? 'desc' : 'asc',
                        });
                      }}
                    >
                      {column.header}
                    </TableSortLabel>
                  ) : (
                    column.header
                  )}
                </TableCell>
              );
            })}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row) => {
            const id = rowKey(row);
            return (
              <TableRow key={id} hover selected={selectedIds.includes(id)}>
                {selectable ? (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.includes(id)}
                      onChange={() => {
                        toggleOne(id);
                      }}
                      inputProps={{ 'aria-label': `Select row ${id}` }}
                    />
                  </TableCell>
                ) : null}
                {columns.map((column) => (
                  <TableCell key={column.id} align={column.align}>
                    {column.render(row)}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  ) : (
    // The mobile fallback: one card per row, primary columns only.
    <Stack spacing={1} sx={{ p: 1 }}>
      {rows.map((row) => {
        const id = rowKey(row);
        return (
          <Card key={id} variant="outlined" sx={{ p: 1.5 }}>
            <Stack spacing={0.5}>
              {columns
                .filter((column) => column.primary !== false)
                .map((column) => (
                  <Stack key={column.id} direction="row" justifyContent="space-between" spacing={2}>
                    <Typography variant="caption" color="text.secondary">
                      {column.header}
                    </Typography>
                    <Box sx={{ textAlign: 'right' }}>{column.render(row)}</Box>
                  </Stack>
                ))}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );

  return (
    <Card variant="outlined">
      {/* Reserved height: a bar that appears on refetch must not push the
          first row under the pointer. */}
      <Box sx={{ height: 4 }}>{loading ? <LinearProgress /> : null}</Box>

      {selectable && selectedIds.length > 0 ? (
        <Typography variant="body2" sx={{ px: 2, py: 1 }} role="status">
          {`${pluralize(selectedIds.length, 'row')} selected`}
        </Typography>
      ) : null}

      {rows.length === 0 && !loading ? (
        <Stack alignItems="center" spacing={1} sx={{ py: 6 }}>
          <Typography color="text.secondary">{emptyMessage}</Typography>
        </Stack>
      ) : (
        body
      )}

      {onPageChange && total !== undefined ? (
        <TablePagination
          component="div"
          count={total}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[pageSize]}
          onPageChange={(_event, next) => {
            onPageChange(next);
          }}
        />
      ) : null}
    </Card>
  );
}
