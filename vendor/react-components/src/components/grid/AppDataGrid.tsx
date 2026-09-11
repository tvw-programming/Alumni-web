import { alpha, useTheme } from '@mui/material/styles';
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  type ColDef,
  type GetRowIdParams,
  type GridApi,
  type GridOptions,
  type GridReadyEvent,
  type RowClickedEvent,
  type RowSelectionOptions,
  type SelectionChangedEvent,
} from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { useCallback, useMemo, useRef } from 'react';

// Register once for the whole app (Community modules only).
// Row grouping is an Enterprise feature and intentionally not exposed here.
ModuleRegistry.registerModules([AllCommunityModule]);

export type GridSelectionMode = 'single' | 'multiple' | 'none';

export interface AppDataGridProps<TData> {
  rowData: TData[] | undefined;
  columnDefs: ColDef<TData>[];
  /** Shows AG Grid's loading overlay. */
  loading?: boolean;
  height?: number | string;
  pagination?: boolean;
  paginationPageSize?: number;
  pageSizeOptions?: number[];
  selectionMode?: GridSelectionMode;
  checkboxSelection?: boolean;
  /** Allow selecting rows by clicking anywhere in the row. Default true. */
  clickSelection?: boolean;
  /** Free-text search across all columns. */
  quickFilterText?: string;
  sortable?: boolean;
  filterable?: boolean;
  resizable?: boolean;
  /** Floating filter row under headers. Default true; pass false to hide. */
  floatingFilter?: boolean;
  /** Animate rows on sort/filter. Default true. */
  animateRows?: boolean;
  /** Allow drag-reordering columns globally. Default true. Per-column: colDef.suppressMovable. */
  columnsMovable?: boolean;
  /**
   * Stable row identity. Required for single-row transaction updates
   * (api.applyTransaction) so only the touched row re-renders.
   */
  getRowId?: (data: TData) => string;
  /** How editing starts on editable columns. Default 'doubleClick'. */
  editOn?: 'click' | 'doubleClick';
  noRowsMessage?: string;
  /** Merged over the computed defaultColDef. */
  defaultColDefOverrides?: ColDef<TData>;
  /** Escape hatch for any other community GridOptions. */
  gridOptions?: GridOptions<TData>;
  onGridReady?: (api: GridApi<TData>) => void;
  onSelectionChanged?: (selectedRows: TData[]) => void;
  onRowClicked?: (row: TData) => void;
}

/**
 * Typed wrapper over AG Grid Community. Pinned columns, custom cell
 * renderers, per-column filters etc. are configured through `columnDefs`.
 */
export function AppDataGrid<TData>({
  rowData,
  columnDefs,
  loading = false,
  height = 520,
  pagination = false,
  paginationPageSize = 10,
  pageSizeOptions,
  selectionMode = 'none',
  checkboxSelection = false,
  clickSelection = true,
  quickFilterText,
  sortable = true,
  filterable = true,
  resizable = true,
  floatingFilter = true,
  animateRows = true,
  columnsMovable = true,
  getRowId,
  editOn = 'doubleClick',
  noRowsMessage = 'No rows to display',
  defaultColDefOverrides,
  gridOptions,
  onGridReady,
  onSelectionChanged,
  onRowClicked,
}: AppDataGridProps<TData>) {
  const apiRef = useRef<GridApi<TData> | null>(null);
  const muiTheme = useTheme();

  // Derive the grid theme from the active MUI theme: transparent surfaces so
  // the grid sits on the page like other themed components (e.g. TextFields),
  // with solid popups (menus/filters) so they stay readable.
  const gridTheme = useMemo(
    () =>
      themeQuartz.withParams({
        backgroundColor: 'transparent',
        foregroundColor: muiTheme.palette.text.primary,
        headerBackgroundColor: 'transparent',
        headerTextColor: muiTheme.palette.text.primary,
        oddRowBackgroundColor: 'transparent',
        chromeBackgroundColor: 'transparent',
        borderColor: muiTheme.palette.divider,
        rowHoverColor: alpha(muiTheme.palette.primary.main, 0.08),
        selectedRowBackgroundColor: alpha(muiTheme.palette.primary.main, 0.16),
        accentColor: muiTheme.palette.primary.main,
        menuBackgroundColor: muiTheme.palette.background.paper,
        menuTextColor: muiTheme.palette.text.primary,
        inputBackgroundColor: 'transparent',
        browserColorScheme: muiTheme.palette.mode,
        fontFamily: muiTheme.typography.fontFamily,
      }),
    [muiTheme],
  );

  const defaultColDef = useMemo<ColDef<TData>>(
    () => ({
      sortable,
      filter: filterable,
      resizable,
      floatingFilter: filterable && floatingFilter,
      flex: 1,
      minWidth: 100,
      ...defaultColDefOverrides,
    }),
    [sortable, filterable, resizable, floatingFilter, defaultColDefOverrides],
  );

  const getRowIdCallback = useMemo(
    () => (getRowId ? (params: GetRowIdParams<TData>) => getRowId(params.data) : undefined),
    [getRowId],
  );

  const rowSelection = useMemo<RowSelectionOptions<TData> | undefined>(() => {
    if (selectionMode === 'none') return undefined;
    if (selectionMode === 'single') {
      return {
        mode: 'singleRow',
        checkboxes: checkboxSelection,
        enableClickSelection: clickSelection,
      };
    }
    return {
      mode: 'multiRow',
      checkboxes: checkboxSelection,
      headerCheckbox: checkboxSelection,
      enableClickSelection: clickSelection,
    };
  }, [selectionMode, checkboxSelection, clickSelection]);

  const overlayNoRowsTemplate = useMemo(
    () => `<span style="padding: 8px;">${noRowsMessage}</span>`,
    [noRowsMessage],
  );

  const paginationPageSizeSelector = useMemo(
    () => pageSizeOptions ?? [paginationPageSize, 25, 50, 100],
    [pageSizeOptions, paginationPageSize],
  );

  const handleGridReady = useCallback(
    (event: GridReadyEvent<TData>) => {
      apiRef.current = event.api;
      onGridReady?.(event.api);
    },
    [onGridReady],
  );

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<TData>) => {
      onSelectionChanged?.(event.api.getSelectedRows());
    },
    [onSelectionChanged],
  );

  const handleRowClicked = useCallback(
    (event: RowClickedEvent<TData>) => {
      if (event.data !== undefined) onRowClicked?.(event.data);
    },
    [onRowClicked],
  );

  return (
    <div style={{ height, width: '100%' }}>
      <AgGridReact<TData>
        theme={gridTheme}
        rowData={rowData ?? null}
        columnDefs={columnDefs}
        defaultColDef={defaultColDef}
        loading={loading}
        pagination={pagination}
        paginationPageSize={paginationPageSize}
        paginationPageSizeSelector={pagination ? paginationPageSizeSelector : undefined}
        rowSelection={rowSelection}
        animateRows={animateRows}
        suppressMovableColumns={!columnsMovable}
        getRowId={getRowIdCallback}
        singleClickEdit={editOn === 'click'}
        quickFilterText={quickFilterText}
        overlayNoRowsTemplate={overlayNoRowsTemplate}
        onGridReady={handleGridReady}
        onSelectionChanged={handleSelectionChanged}
        onRowClicked={handleRowClicked}
        {...gridOptions}
      />
    </div>
  );
}
