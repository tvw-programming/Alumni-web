import { toDisplayString } from '@/utils/format';

import type { ColDef, GridApi } from 'ag-grid-community';

/* ------------------------------------------------------------------ */
/* Page preferences (column layout)                                    */
/* ------------------------------------------------------------------ */

/** Width presets offered by the Page Preferences panel. */
export type ColumnWidthMode = 'default' | 'auto' | 'px50' | 'px100' | 'px20';

export const WIDTH_MODE_OPTIONS: readonly {
  value: ColumnWidthMode;
  label: string;
  /** Fixed pixel width; undefined for 'default' (flex) and 'auto' (autoSize). */
  width?: number;
}[] = [
  { value: 'default', label: 'Default width' },
  { value: 'auto', label: 'Auto-size to content' },
  { value: 'px50', label: 'Small (50 px)', width: 50 },
  { value: 'px100', label: 'Fixed (100 px)', width: 100 },
  { value: 'px20', label: 'Minimal (20 px)', width: 20 },
];

export type ColumnPinned = 'left' | 'right' | null;

/** Per-column layout preference, editable in the PagePreferencesPanel. */
export interface ColumnPreference {
  colId: string;
  headerName: string;
  widthMode: ColumnWidthMode;
  pinned: ColumnPinned;
  /** When true the column cannot be drag-reordered in the grid. */
  lockOrder: boolean;
  orderIndex: number;
}

export type SortDirection = 'asc' | 'desc';

/** One row of the multi-column sort priority (top tier wins first). */
export interface SortTier {
  colId: string;
  direction: SortDirection | '';
}

export function createEmptySortTiers(count = 3): SortTier[] {
  return Array.from({ length: count }, () => ({ colId: '', direction: '' as const }));
}

function resolveColId<TData>(def: ColDef<TData>): string {
  return def.colId ?? (typeof def.field === 'string' ? def.field : '');
}

/** Seed preferences from base column definitions (default layout). */
export function buildColumnPreferences<TData>(colDefs: ColDef<TData>[]): ColumnPreference[] {
  return colDefs.map((def, index) => ({
    colId: resolveColId(def),
    headerName: def.headerName ?? resolveColId(def),
    widthMode: 'default',
    pinned: def.pinned === 'left' || def.pinned === 'right' ? def.pinned : null,
    lockOrder: def.suppressMovable ?? false,
    orderIndex: index,
  }));
}

/**
 * Merge preferences over base column definitions: order, width mode,
 * pinning and reorder-locking. Base defs are never mutated.
 */
export function applyPreferencesToColDefs<TData>(
  baseColDefs: ColDef<TData>[],
  preferences: ColumnPreference[],
): ColDef<TData>[] {
  const byColId = new Map(baseColDefs.map((def) => [resolveColId(def), def]));
  return [...preferences]
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .flatMap((pref) => {
      const base = byColId.get(pref.colId);
      if (!base) return [];
      const next: ColDef<TData> = {
        ...base,
        pinned: pref.pinned,
        suppressMovable: pref.lockOrder,
      };
      const mode = WIDTH_MODE_OPTIONS.find((option) => option.value === pref.widthMode);
      if (mode?.width !== undefined) {
        // Fixed width: disable flex and relax minWidth so small sizes apply.
        next.width = mode.width;
        next.minWidth = mode.width;
        next.flex = 0;
      } else if (pref.widthMode === 'auto') {
        // Width is set by api.autoSizeColumns() (see applyWidthModes).
        next.flex = 0;
      }
      return [next];
    });
}

/** Auto-size every column whose preference is 'auto'. Call after defs apply. */
export function applyWidthModes<TData>(api: GridApi<TData>, preferences: ColumnPreference[]): void {
  const autoColIds = preferences.filter((p) => p.widthMode === 'auto').map((p) => p.colId);
  if (autoColIds.length > 0) api.autoSizeColumns(autoColIds);
}

/** Apply tiered multi-column sorting (priority = tier index) via column state. */
export function applySortTiers<TData>(api: GridApi<TData>, tiers: SortTier[]): void {
  const active = tiers.filter(
    (tier): tier is { colId: string; direction: SortDirection } =>
      tier.colId !== '' && tier.direction !== '',
  );
  api.applyColumnState({
    state: active.map((tier, index) => ({
      colId: tier.colId,
      sort: tier.direction,
      sortIndex: index,
    })),
    defaultState: { sort: null },
  });
}

/** Re-index preferences to match an explicit colId order (e.g. after drag). */
export function reorderPreferences(
  preferences: ColumnPreference[],
  orderedColIds: string[],
): ColumnPreference[] {
  const position = new Map(orderedColIds.map((colId, index) => [colId, index]));
  return preferences.map((pref) => ({
    ...pref,
    orderIndex: position.get(pref.colId) ?? pref.orderIndex,
  }));
}

/* ------------------------------------------------------------------ */
/* Filter preferences (config-driven filter panel)                     */
/* ------------------------------------------------------------------ */

export type ColumnDataType = 'text' | 'number' | 'date' | 'dateTime';
export type FilterSelectionMode = 'single' | 'multiple';

/** Static config describing how one field appears in the filter panel. */
export interface FilterFieldConfig<TData> {
  colId: string;
  headerName: string;
  dataType: ColumnDataType;
  /** Only meaningful for 'text'. Default 'single'. */
  selectionMode?: FilterSelectionMode;
  /** Static dropdown options; omit to derive unique values from row data. */
  options?: string[];
  /** Row accessor; defaults to `row[colId]`. Use for nested fields. */
  getValue?: (row: TData) => unknown;
}

export type FilterValue =
  | { kind: 'single'; value: string }
  | { kind: 'multiple'; values: string[] }
  /** Date range as yyyy-MM-dd strings, number range as numeric strings. */
  | { kind: 'range'; start: string; end: string };

export type GridFilterState = Record<string, FilterValue | undefined>;

function readValue<TData>(config: FilterFieldConfig<TData>, row: TData): unknown {
  if (config.getValue) return config.getValue(row);
  return (row as Record<string, unknown>)[config.colId];
}

/** Unique, sorted string options derived from the current rows. */
export function deriveFilterOptions<TData>(
  rows: TData[],
  config: FilterFieldConfig<TData>,
): string[] {
  const unique = new Set<string>();
  for (const row of rows) {
    const text = toDisplayString(readValue(config, row));
    if (text !== '') unique.add(text);
  }
  return [...unique].sort((a, b) => a.localeCompare(b));
}

/** Parse date-ish values ("1996-5-30", ISO strings, Date, epoch) to epoch ms. */
export function parseDateValue(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  if (typeof value !== 'string' || value === '') return null;
  const parts = value.split(/[-/]/).map(Number);
  if (parts.length === 3 && parts.every((n) => Number.isFinite(n)) && parts[0] > 31) {
    return new Date(parts[0], parts[1] - 1, parts[2]).getTime();
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function endOfDay(value: string): number | null {
  const start = parseDateValue(value);
  return start === null ? null : start + 24 * 60 * 60 * 1000 - 1;
}

function rowPassesFilter<TData>(
  row: TData,
  config: FilterFieldConfig<TData>,
  filter: FilterValue,
): boolean {
  const raw = readValue(config, row);
  switch (filter.kind) {
    case 'single':
      return filter.value === '' || toDisplayString(raw) === filter.value;
    case 'multiple':
      return filter.values.length === 0 || filter.values.includes(toDisplayString(raw));
    case 'range': {
      if (filter.start === '' && filter.end === '') return true;
      if (config.dataType === 'number') {
        const num = typeof raw === 'number' ? raw : Number(raw);
        if (!Number.isFinite(num)) return false;
        if (filter.start !== '' && num < Number(filter.start)) return false;
        if (filter.end !== '' && num > Number(filter.end)) return false;
        return true;
      }
      const time = parseDateValue(raw);
      if (time === null) return false;
      const start = filter.start === '' ? null : parseDateValue(filter.start);
      const end = filter.end === '' ? null : endOfDay(filter.end);
      if (start !== null && time < start) return false;
      if (end !== null && time > end) return false;
      return true;
    }
  }
}

/** Pure, client-side filtering — keeps AG Grid rendering untouched and fast. */
export function applyFiltersToRows<TData>(
  rows: TData[],
  configs: FilterFieldConfig<TData>[],
  state: GridFilterState,
): TData[] {
  const active = configs.flatMap((config) => {
    const filter = state[config.colId];
    return filter ? [{ config, filter }] : [];
  });
  if (active.length === 0) return rows;
  return rows.filter((row) =>
    active.every(({ config, filter }) => rowPassesFilter(row, config, filter)),
  );
}
