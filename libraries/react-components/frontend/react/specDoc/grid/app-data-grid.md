## Component Specification

### Name & Purpose

`AppDataGrid` — the typed AG Grid wrapper. The single place grid defaults,
theming and overlays are configured, so no page touches AG Grid's API directly.

### Location

`src/components/grid/AppDataGrid.tsx`, `src/components/grid/GridHeaderActions.tsx`,
`src/components/grid/gridPreferences.ts`

### Public Interface

```tsx
export type GridSelectionMode = 'single' | 'multiple' | 'none';

export interface AppDataGridProps<TData> {
  rowData: TData[] | undefined;
  columnDefs: ColDef<TData>[];
  loading?: boolean;
  height?: number | string;
  pagination?: boolean;
  paginationPageSize?: number;
  selectionMode?: GridSelectionMode;
  quickFilterText?: string;
  noRowsMessage?: string;
  getRowId?: (row: TData) => string;
  floatingFilter?: boolean;
  animateRows?: boolean;
  columnsMovable?: boolean;
  gridOptions?: GridOptions<TData>;
  onGridReady?: (api: GridApi<TData>) => void;
  onRowClicked?: (row: TData) => void;
  onSelectionChanged?: (rows: TData[]) => void;
}
export function AppDataGrid<TData>(props: AppDataGridProps<TData>): JSX.Element;
```

### Dependencies

- Internal: theme context (for light/dark).
- External: `ag-grid-community` + `ag-grid-react` **v33**, MUI.

### Data Models

Generic over `TData`. Owns no entity.

### Business Rules & Constraints

- **AG Grid needs a resolved height.** `flex: 1 1 auto` inside a card leaves the
  row viewport at zero — header and pagination render, and no rows. Every grid
  page sets an explicit height.
- **`getRowId` is required for transactions.** Row refresh and optimistic
  rollback use `applyTransaction`, which needs stable row identity.
- **`loading` belongs on the grid, not on a wrapping card.** A card's loading
  state replaces its content, which tears the grid down and rebuilds it on every
  refetch; the grid has its own overlay.
- **This app is on AG Grid v33.** The Angular app is on **v36** and the theming
  and `rowSelection` APIs differ — do not copy grid config between them.

> **Testing trap.** `.ag-row` elements are position-absolute and recycled, so
> **DOM order is not visual order**. Any assertion about row position must sort
> by bounding rect.

**`gridPreferences.ts`** (React only) provides per-user column order, width
modes, sort tiers and filter presets: `buildColumnPreferences`,
`applyPreferencesToColDefs`, `applySortTiers`, `applyWidthModes`,
`applyFiltersToRows`, `reorderPreferences`. **The Angular app has no equivalent.**

### Extension Points

- **A new grid:** `columnDefs` + `rowData` + `getRowId`. Nothing else.
- **A new grid-wide default:** `AppDataGrid`; every grid gains it.
- **Editable columns:** do not hand-write editors — see
  [`inline-editing.md`](inline-editing.md).
- **A custom cell:** a renderer component, set as `cellRenderer` on the column.
