import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import Box from '@mui/material/Box';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useMemo, useState } from 'react';

import {
  WIDTH_MODE_OPTIONS,
  reorderPreferences,
  type ColumnPinned,
  type ColumnPreference,
  type SortTier,
} from './gridPreferences';

export interface PagePreferencesPanelProps {
  /** Current per-column layout preferences (controlled). */
  preferences: ColumnPreference[];
  onPreferencesChange: (next: ColumnPreference[]) => void;
  /** Multi-column sort priority, top tier first (controlled). */
  sortTiers: SortTier[];
  onSortTiersChange: (next: SortTier[]) => void;
}

/**
 * Popup typography matches the data grid: AG Grid's quartz theme renders rows
 * at 14px (0.875rem = MUI body2), so every cell, select and menu item here
 * uses the same size instead of ad-hoc smaller values.
 */
const POPUP_FONT_SIZE = '0.875rem';
const CELL_SX = { px: 0.75, py: 0.25, fontSize: POPUP_FONT_SIZE, lineHeight: 1.4 } as const;
const HEAD_SX = { fontWeight: 600, color: 'text.secondary', whiteSpace: 'nowrap' } as const;

/**
 * Page preferences: a compact drag-sortable table with one row per column
 * (order #, drag handle, width mode, left/right pinning, reorder-locking),
 * plus a tiered multi-column sort priority. Fully controlled.
 *
 * Drag-and-drop is implemented with the native HTML5 DnD API — no extra
 * dependencies. Rows turn semi-transparent while dragged and show a drop
 * indicator line on the target row.
 */
export function PagePreferencesPanel({
  preferences,
  onPreferencesChange,
  sortTiers,
  onSortTiersChange,
}: PagePreferencesPanelProps) {
  const ordered = useMemo(
    () => [...preferences].sort((a, b) => a.orderIndex - b.orderIndex),
    [preferences],
  );

  // ── Drag state ────────────────────────────────────────────────────────────
  // State, not a ref: `isDragging` below drives the dragged row's styling, and
  // a ref write does not re-render — the row only restyled once some *other*
  // state change happened to force a render. Reading a ref during render is
  // what react-hooks/refs flags, and this is exactly the bug it predicts.
  const [draggingColId, setDraggingColId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);
  const [dragPos, setDragPos] = useState<'above' | 'below'>('below');

  const handleDragStart = (colId: string) => (e: React.DragEvent) => {
    setDraggingColId(colId);
    e.dataTransfer.effectAllowed = 'move';
    // Minimal ghost image offset so cursor sits on the handle
    e.dataTransfer.setDragImage(e.currentTarget.closest('tr') as Element, 12, 12);
  };

  const handleDragOver = (colId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (colId === draggingColId) return;
    setDragOverColId(colId);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragPos(e.clientY < rect.top + rect.height / 2 ? 'above' : 'below');
  };

  const handleDrop = (targetColId: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const srcId = draggingColId;
    if (!srcId || srcId === targetColId) return;

    // Build new ordered list by inserting src before/after target
    const ids = ordered.map((p) => p.colId);
    const srcIdx = ids.indexOf(srcId);
    ids.splice(srcIdx, 1);
    const targetIdx = ids.indexOf(targetColId);
    const insertAt = dragPos === 'above' ? targetIdx : targetIdx + 1;
    ids.splice(insertAt, 0, srcId);

    onPreferencesChange(reorderPreferences(preferences, ids));
    setDraggingColId(null);
    setDragOverColId(null);
  };

  const handleDragEnd = () => {
    setDraggingColId(null);
    setDragOverColId(null);
  };

  // ── Column helpers ────────────────────────────────────────────────────────
  const updateColumn = (colId: string, patch: Partial<ColumnPreference>) => {
    onPreferencesChange(
      preferences.map((pref) => (pref.colId === colId ? { ...pref, ...patch } : pref)),
    );
  };

  const togglePin = (pref: ColumnPreference, side: Exclude<ColumnPinned, null>) => {
    updateColumn(pref.colId, { pinned: pref.pinned === side ? null : side });
  };

  // ── Sort tier helpers ─────────────────────────────────────────────────────
  const updateTier = (index: number, patch: Partial<SortTier>) => {
    onSortTiersChange(sortTiers.map((tier, i) => (i === index ? { ...tier, ...patch } : tier)));
  };

  return (
    <Stack spacing={1.5}>
      {/* ── Column layout table ─────────────────────────────────────────── */}
      <Box>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
        >
          Column layout
        </Typography>

        <Table
          size="small"
          sx={{
            '& td, & th': CELL_SX,
            '& th': HEAD_SX,
            tableLayout: 'fixed',
          }}
        >
          <TableHead>
            <TableRow>
              {/* drag handle column — no label */}
              <TableCell sx={{ width: 28, p: '0 !important' }} />
              <TableCell sx={{ width: 32 }} align="center">
                #
              </TableCell>
              <TableCell>Column</TableCell>
              <TableCell sx={{ width: 118 }}>Width</TableCell>
              <TableCell align="center" sx={{ width: 62 }}>
                Pin Left
              </TableCell>
              <TableCell align="center" sx={{ width: 64 }}>
                Pin Right
              </TableCell>
              <TableCell align="center" sx={{ width: 44 }}>
                Lock
              </TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {ordered.map((pref, idx) => {
              const isDragging = draggingColId === pref.colId;
              const isTarget = dragOverColId === pref.colId && !isDragging;

              return (
                <TableRow
                  key={pref.colId}
                  hover
                  draggable
                  onDragStart={handleDragStart(pref.colId)}
                  onDragOver={handleDragOver(pref.colId)}
                  onDrop={handleDrop(pref.colId)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    '&:last-child td': { borderBottom: 0 },
                    opacity: isDragging ? 0.35 : 1,
                    transition: 'opacity 0.15s',
                    cursor: 'grab',
                    borderTop: isTarget && dragPos === 'above' ? '2px solid' : undefined,
                    borderBottom: isTarget && dragPos === 'below' ? '2px solid' : undefined,
                    borderColor: 'primary.main',
                  }}
                >
                  {/* Drag handle */}
                  <TableCell sx={{ p: '0 2px !important', width: 28 }}>
                    <Tooltip title="Drag to reorder" placement="right" arrow>
                      <IconButton
                        size="small"
                        disableRipple
                        sx={{
                          p: 0.25,
                          color: 'text.disabled',
                          cursor: 'grab',
                          '&:hover': { color: 'text.primary' },
                        }}
                      >
                        <DragIndicatorIcon sx={{ fontSize: '1rem' }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>

                  {/* Order number */}
                  <TableCell
                    align="center"
                    sx={{
                      fontVariantNumeric: 'tabular-nums',
                      color: 'text.secondary',
                    }}
                  >
                    {idx + 1}
                  </TableCell>

                  {/* Column name */}
                  <TableCell
                    sx={{
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {pref.headerName}
                  </TableCell>

                  {/* Width mode */}
                  <TableCell>
                    <FormControl size="small" fullWidth>
                      <Select
                        value={pref.widthMode}
                        variant="standard"
                        disableUnderline
                        sx={{ fontSize: POPUP_FONT_SIZE }}
                        inputProps={{ 'aria-label': `${pref.headerName} width mode` }}
                        onChange={(event) =>
                          updateColumn(pref.colId, {
                            widthMode: event.target.value,
                          })
                        }
                      >
                        {WIDTH_MODE_OPTIONS.map((option) => (
                          <MenuItem
                            key={option.value}
                            value={option.value}
                            sx={{ fontSize: POPUP_FONT_SIZE }}
                          >
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </TableCell>

                  {/* Pin Left */}
                  <TableCell align="center" sx={{ p: '0 !important' }}>
                    <Checkbox
                      size="small"
                      checked={pref.pinned === 'left'}
                      inputProps={{ 'aria-label': `Pin ${pref.headerName} left` }}
                      onChange={() => togglePin(pref, 'left')}
                      sx={{ p: 0.25 }}
                    />
                  </TableCell>

                  {/* Pin Right */}
                  <TableCell align="center" sx={{ p: '0 !important' }}>
                    <Checkbox
                      size="small"
                      checked={pref.pinned === 'right'}
                      inputProps={{ 'aria-label': `Pin ${pref.headerName} right` }}
                      onChange={() => togglePin(pref, 'right')}
                      sx={{ p: 0.25 }}
                    />
                  </TableCell>

                  {/* Lock order */}
                  <TableCell align="center" sx={{ p: '0 !important' }}>
                    <Checkbox
                      size="small"
                      checked={pref.lockOrder}
                      inputProps={{ 'aria-label': `Lock ${pref.headerName} order` }}
                      onChange={(event) =>
                        updateColumn(pref.colId, { lockOrder: event.target.checked })
                      }
                      sx={{ p: 0.25 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Box>

      {/* ── Sort priority ───────────────────────────────────────────────── */}
      <Box>
        <Typography
          variant="caption"
          fontWeight={700}
          color="text.secondary"
          sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', mb: 0.5 }}
        >
          Sort priority (top → bottom)
        </Typography>

        <Stack spacing={0.75}>
          {sortTiers.map((tier, index) => {
            const usedElsewhere = new Set(
              sortTiers.filter((_, i) => i !== index).map((t) => t.colId),
            );
            return (
              <Stack key={index} direction="row" spacing={1} alignItems="center">
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ width: 68, flexShrink: 0 }}
                >
                  Priority {index + 1}
                </Typography>

                <FormControl size="small" sx={{ flex: 1 }}>
                  <Select
                    displayEmpty
                    value={tier.colId}
                    sx={{ fontSize: POPUP_FONT_SIZE }}
                    inputProps={{ 'aria-label': `Priority ${index + 1} column` }}
                    onChange={(event) =>
                      updateTier(index, {
                        colId: event.target.value,
                        direction: event.target.value === '' ? '' : tier.direction,
                      })
                    }
                  >
                    <MenuItem value="" sx={{ fontSize: POPUP_FONT_SIZE }}>
                      <em>None</em>
                    </MenuItem>
                    {ordered
                      .filter((pref) => !usedElsewhere.has(pref.colId))
                      .map((pref) => (
                        <MenuItem
                          key={pref.colId}
                          value={pref.colId}
                          sx={{ fontSize: POPUP_FONT_SIZE }}
                        >
                          {pref.headerName}
                        </MenuItem>
                      ))}
                  </Select>
                </FormControl>

                <FormControl size="small" sx={{ flex: 1 }} disabled={tier.colId === ''}>
                  <Select
                    displayEmpty
                    value={tier.direction}
                    sx={{ fontSize: POPUP_FONT_SIZE }}
                    inputProps={{ 'aria-label': `Priority ${index + 1} direction` }}
                    onChange={(event) => updateTier(index, { direction: event.target.value })}
                  >
                    <MenuItem value="" sx={{ fontSize: POPUP_FONT_SIZE }}>
                      <em>None</em>
                    </MenuItem>
                    <MenuItem value="asc" sx={{ fontSize: POPUP_FONT_SIZE }}>
                      Ascending
                    </MenuItem>
                    <MenuItem value="desc" sx={{ fontSize: POPUP_FONT_SIZE }}>
                      Descending
                    </MenuItem>
                  </Select>
                </FormControl>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Stack>
  );
}
