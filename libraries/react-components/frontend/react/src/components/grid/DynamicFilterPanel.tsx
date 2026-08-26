import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import ListItemText from '@mui/material/ListItemText';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useMemo } from 'react';

import {
  deriveFilterOptions,
  type FilterFieldConfig,
  type FilterValue,
  type GridFilterState,
} from './gridPreferences';

export interface DynamicFilterPanelProps<TData> {
  /** Static config: which fields to show and how (dataType drives the control). */
  configs: FilterFieldConfig<TData>[];
  /** Current rows — used to derive dropdown options when config.options is omitted. */
  rows: TData[];
  filterState: GridFilterState;
  onFilterStateChange: (next: GridFilterState) => void;
  /**
   * Fixed column count — every control gets an equal share (e.g. 2 → each
   * filter takes 50% of a row). Omit for the responsive 1/2/3-column default.
   */
  columns?: number;
}

/**
 * Config-driven filter panel with a single, consistent control style:
 * - text + single    → single-select dropdown
 * - text + multiple  → multi-select dropdown with checkboxes
 * - date / dateTime  → "<Field> from" / "<Field> to" outlined date inputs
 * - number           → "<Field> min" / "<Field> max" outlined number inputs
 *
 * Every control is a small outlined MUI field with a floating label, so
 * dropdowns and ranges look and behave identically. Controlled — parent
 * applies state.
 */
export function DynamicFilterPanel<TData>({
  configs,
  rows,
  filterState,
  onFilterStateChange,
  columns,
}: DynamicFilterPanelProps<TData>) {
  const optionsByColId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const config of configs) {
      if (config.dataType === 'text') {
        map.set(config.colId, config.options ?? deriveFilterOptions(rows, config));
      }
    }
    return map;
  }, [configs, rows]);

  const setFilter = (colId: string, value: FilterValue | undefined) => {
    onFilterStateChange({ ...filterState, [colId]: value });
  };

  const hasActiveFilters = configs.some((config) => filterState[config.colId] !== undefined);

  // ── Text / dropdown controls ──────────────────────────────────────────────
  const renderTextControl = (config: FilterFieldConfig<TData>) => {
    const current = filterState[config.colId];
    const options = optionsByColId.get(config.colId) ?? [];

    if (config.selectionMode === 'multiple') {
      const values = current?.kind === 'multiple' ? current.values : [];
      return (
        <FormControl size="small" fullWidth>
          <InputLabel id={`filter-${config.colId}`}>{config.headerName}</InputLabel>
          <Select
            multiple
            labelId={`filter-${config.colId}`}
            value={values}
            input={<OutlinedInput label={config.headerName} />}
            renderValue={(selected) => selected.join(', ')}
            onChange={(event) => {
              const next =
                typeof event.target.value === 'string'
                  ? event.target.value.split(',')
                  : event.target.value;
              setFilter(
                config.colId,
                next.length > 0 ? { kind: 'multiple', values: next } : undefined,
              );
            }}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox size="small" checked={values.includes(option)} />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    const value = current?.kind === 'single' ? current.value : '';
    return (
      <FormControl size="small" fullWidth>
        <InputLabel id={`filter-${config.colId}`}>{config.headerName}</InputLabel>
        <Select
          labelId={`filter-${config.colId}`}
          label={config.headerName}
          value={value}
          onChange={(event) =>
            setFilter(
              config.colId,
              event.target.value === '' ? undefined : { kind: 'single', value: event.target.value },
            )
          }
        >
          <MenuItem value="">
            <em>All</em>
          </MenuItem>
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  // ── Range controls (date & number) ────────────────────────────────────────
  // Rendered as two standard small outlined TextFields ("<Field> from/to" or
  // "<Field> min/max") so every filter — dropdown or range — shares the same
  // control style, height, label behavior and clearing model.
  const renderRangeControl = (config: FilterFieldConfig<TData>) => {
    const current = filterState[config.colId];
    const range = current?.kind === 'range' ? current : { start: '', end: '' };
    const isDate = config.dataType === 'date' || config.dataType === 'dateTime';
    const inputType =
      config.dataType === 'dateTime' ? 'datetime-local' : isDate ? 'date' : 'number';
    const startLabel = isDate ? `${config.headerName} from` : `${config.headerName} min`;
    const endLabel = isDate ? `${config.headerName} to` : `${config.headerName} max`;

    const setRange = (patch: Partial<{ start: string; end: string }>) => {
      const next = { ...range, ...patch };
      setFilter(
        config.colId,
        next.start === '' && next.end === ''
          ? undefined
          : { kind: 'range', start: next.start, end: next.end },
      );
    };

    return (
      <Stack direction="row" spacing={1.5}>
        <TextField
          size="small"
          fullWidth
          type={inputType}
          label={startLabel}
          value={range.start}
          onChange={(event) => setRange({ start: event.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          size="small"
          fullWidth
          type={inputType}
          label={endLabel}
          value={range.end}
          onChange={(event) => setRange({ end: event.target.value })}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </Stack>
    );
  };

  const renderControl = (config: FilterFieldConfig<TData>) => {
    if (config.dataType === 'text') return renderTextControl(config);
    return renderRangeControl(config);
  };

  return (
    <Stack spacing={1.5}>
      <Box
        display="grid"
        gap={1.5}
        gridTemplateColumns={
          columns ? `repeat(${columns}, 1fr)` : { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr' }
        }
      >
        {configs.map((config) => (
          <Box key={config.colId}>{renderControl(config)}</Box>
        ))}
      </Box>

      <Box>
        <Button
          size="small"
          color="error"
          disabled={!hasActiveFilters}
          onClick={() => onFilterStateChange({})}
          sx={{ fontSize: '0.875rem' }}
        >
          Clear all filters
        </Button>
      </Box>
    </Stack>
  );
}
