import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppDataGrid } from '@/components/grid/AppDataGrid';
import { GridHeaderActions } from '@/components/grid/GridHeaderActions';
import {
  applyFiltersToRows,
  applyPreferencesToColDefs,
  applySortTiers,
  applyWidthModes,
  buildColumnPreferences,
  reorderPreferences,
  type FilterFieldConfig,
} from '@/components/grid/gridPreferences';
import { GenderIconRenderer } from '@/components/grid/renderers/GenderIconRenderer';
import { HtmlCellRenderer } from '@/components/grid/renderers/HtmlCellRenderer';
import { RefreshRowRenderer } from '@/components/grid/renderers/RefreshRowRenderer';
import { UppercaseActionRenderer } from '@/components/grid/renderers/UppercaseActionRenderer';
import {
  UsersPreferencesContainer,
  type FilterPreferencesDraft,
  type PagePreferencesDraft,
} from '@/features/users/UsersPreferencesContainer';
import { useGridPreferences } from '@/hooks/useGridPreferences';
import { useUsers } from '@/hooks/useUsers';

import type { User } from '@/types/user';
import type { ColDef, ColumnMovedEvent, GridApi } from 'ag-grid-community';

const USER_FILTERS = { search: '' } as const;

function getUserRowId(user: User): string {
  return String(user.id);
}

const BASE_COLUMN_DEFS: ColDef<User>[] = [
  { field: 'id', headerName: 'ID', maxWidth: 90, flex: 0 },
  { field: 'firstName', headerName: 'First name' },
  { field: 'lastName', headerName: 'Last name' },
  { field: 'gender', headerName: 'Gender', cellRenderer: GenderIconRenderer },
  { field: 'email', headerName: 'Email', minWidth: 220 },
  { field: 'birthDate', headerName: 'Birth date' },
  { field: 'age', headerName: 'Age', filter: 'agNumberColumnFilter', maxWidth: 110 },
  {
    colId: 'role',
    headerName: 'Role',
    sortable: false,
    filter: false,
    cellRenderer: HtmlCellRenderer,
    valueGetter: ({ data }) =>
      data?.company
        ? `<strong>${data.company.title ?? ''}</strong> · <em>${data.company.name ?? ''}</em>`
        : '',
  },
  {
    colId: 'action',
    headerName: 'Action',
    sortable: false,
    filter: false,
    minWidth: 140,
    cellRenderer: UppercaseActionRenderer,
  },
  {
    colId: 'refresh',
    headerName: 'Refresh',
    sortable: false,
    filter: false,
    minWidth: 150,
    cellRenderer: RefreshRowRenderer,
  },
];

const DEFAULT_PREFERENCES = buildColumnPreferences(BASE_COLUMN_DEFS);

const FILTER_CONFIGS: FilterFieldConfig<User>[] = [
  { colId: 'gender', headerName: 'Gender', dataType: 'text', selectionMode: 'single' },
  {
    colId: 'company',
    headerName: 'Company',
    dataType: 'text',
    selectionMode: 'multiple',
    getValue: (user) => user.company?.name,
  },
  { colId: 'birthDate', headerName: 'Birth date', dataType: 'date' },
  { colId: 'age', headerName: 'Age', dataType: 'number' },
];

interface UsersManagedGridProps {
  onGridReady?: (api: GridApi<User>) => void;
}

/**
 * Users grid with page/filter preferences + custom renderers + GridHeaderActions
 * toolbar, extracted from UsersGridPage for embedding in the Manage User page.
 * The grid config is unchanged; `onGridReady` exposes the API for row prepend.
 */
export function UsersManagedGrid({ onGridReady }: UsersManagedGridProps) {
  const usersQuery = useUsers(USER_FILTERS);
  const rows = usersQuery.data?.users;

  const {
    preferences,
    sortTiers,
    filterState,
    setPreferences,
    setSortTiers,
    setFilterState,
    reset,
  } = useGridPreferences('grid-prefs:users', DEFAULT_PREFERENCES);

  const [quickFilter, setQuickFilter] = useState('');
  const apiRef = useRef<GridApi<User> | null>(null);
  const fullscreenRef = useRef<HTMLDivElement>(null);

  const columnDefs = useMemo(
    () => applyPreferencesToColDefs(BASE_COLUMN_DEFS, preferences),
    [preferences],
  );

  const filteredRows = useMemo(
    () => (rows ? applyFiltersToRows(rows, FILTER_CONFIGS, filterState) : undefined),
    [rows, filterState],
  );

  useEffect(() => {
    if (apiRef.current) applySortTiers(apiRef.current, sortTiers);
  }, [sortTiers]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api) return;
    const frame = requestAnimationFrame(() => applyWidthModes(api, preferences));
    return () => cancelAnimationFrame(frame);
  }, [preferences]);

  // `sortTiers` and `preferences` belong in the dependency list: AG Grid calls
  // this once, when the grid mounts, and the two effects above only re-apply
  // *changes* made after that point. If a preference changed before the grid
  // became ready, the omitted deps meant this ran with the values captured on
  // an earlier render and the grid opened with stale sorting and widths.
  // Identity churn is harmless — AG Grid fires onGridReady once regardless.
  const handleGridReady = useCallback(
    (api: GridApi<User>) => {
      apiRef.current = api;
      applySortTiers(api, sortTiers);
      applyWidthModes(api, preferences);
      onGridReady?.(api);
    },
    [onGridReady, sortTiers, preferences],
  );

  const handlePagePreferencesApply = useCallback(
    (draft: PagePreferencesDraft) => {
      setPreferences(draft.preferences);
      setSortTiers(draft.sortTiers);
    },
    [setPreferences, setSortTiers],
  );

  const handleFilterPreferencesApply = useCallback(
    (draft: FilterPreferencesDraft) => {
      setFilterState(draft.filterState);
    },
    [setFilterState],
  );

  const handleColumnMoved = useCallback(
    (event: ColumnMovedEvent<User>) => {
      if (!event.finished || event.source !== 'uiColumnMoved') return;
      const orderedColIds = event.api.getAllGridColumns().map((column) => column.getColId());
      setPreferences((prev) => reorderPreferences(prev, orderedColIds));
    },
    [setPreferences],
  );

  return (
    <Box
      ref={fullscreenRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        flexGrow: 1,
        minHeight: 0,
        bgcolor: 'transparent',
        '&:fullscreen': { bgcolor: 'background.default', overflow: 'auto', p: 2 },
      }}
    >
      <GridHeaderActions
        title="Users grid"
        quickFilter={quickFilter}
        onQuickFilterChange={setQuickFilter}
        fullscreenTargetRef={fullscreenRef}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            <UsersPreferencesContainer
              preferences={preferences}
              defaultPreferences={DEFAULT_PREFERENCES}
              sortTiers={sortTiers}
              filterState={filterState}
              onPagePreferencesApply={handlePagePreferencesApply}
              onFilterPreferencesApply={handleFilterPreferencesApply}
              filterConfigs={FILTER_CONFIGS}
              rows={rows ?? []}
            />
            <Button variant="outlined" size="small" onClick={reset}>
              Reset
            </Button>
          </Stack>
        }
      />
      <Box sx={{ flexGrow: 1, minHeight: 0, mt: 2 }}>
        <AppDataGrid<User>
          rowData={filteredRows}
          columnDefs={columnDefs}
          loading={usersQuery.isPending}
          height="100%"
          pagination
          paginationPageSize={10}
          selectionMode="none"
          quickFilterText={quickFilter}
          noRowsMessage="No users match the current filters"
          getRowId={getUserRowId}
          floatingFilter
          animateRows
          columnsMovable
          gridOptions={{ onColumnMoved: handleColumnMoved }}
          onGridReady={handleGridReady}
        />
      </Box>
    </Box>
  );
}
