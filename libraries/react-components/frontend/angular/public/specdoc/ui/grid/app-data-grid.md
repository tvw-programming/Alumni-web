## Component Specification

### Name & Purpose
`AppDataGrid` — the AG Grid **v36** wrapper. Same prop surface as React's, but
the internals are not portable between them.

### Location
`src/app/shared/grid/app-data-grid.ts`, `ag-grid-setup.ts`

### Public Interface

```ts
@Component({ selector: 'app-data-grid' })
export class AppDataGrid<TData> {
  readonly rowData = input<TData[] | undefined>(undefined);
  readonly columnDefs = input.required<ColDef<TData>[]>();
  readonly loading = input(false);
  readonly quickFilterText = input('');
  readonly pagination = input(false);
  readonly paginationPageSize = input(10);
  readonly pageSizeOptions = input<number[]>([10, 25, 50, 100]);
  readonly selectionMode = input<GridSelectionMode>('none');
  readonly sortable = input(true);
  readonly filterable = input(true);
  readonly resizable = input(true);
  readonly floatingFilter = input(false);
  readonly noRowsMessage = input('No rows to show');
  readonly rowId = input<((row: TData) => string) | undefined>(undefined);
  readonly defaultColDefOverrides = input<ColDef<TData>>({});
  readonly gridOptionsOverrides = input<GridOptions<TData>>({});

  readonly gridReady = output<GridApi<TData>>();
  readonly rowClicked = output<TData>();
  readonly selectionChanged = output<TData[]>();
}
```

### Dependencies
- Internal: `ThemeStore`, `ag-grid-setup.ts`.
- External: `ag-grid-angular` + `ag-grid-community` **v36**.

### Data Models
Generic over `TData`.

### Business Rules & Constraints

**Registration is in `ag-grid-setup.ts`, imported only by grid components** — not
in `main.ts`. Moving it cut the initial bundle from **949 kB to 287 kB**.

**Theming lets the scheme own the colours:**

```ts
protected readonly theme = computed(() => {
  const scheme = this.themeStore.isDark() ? colorSchemeDark : colorSchemeLight;
  return themeQuartz.withPart(scheme).withParams({ fontFamily: 'inherit', headerFontWeight: 600 });
});
```

Two things learned the hard way:
1. **The v36 Theming API does not resolve `var(--mat-sys-*)`.** Feeding it
   Material tokens produced washed-out, unreadable text.
2. **`backgroundColor: 'transparent'` breaks contrast derivation** — the scheme
   computes foregrounds from the background.

Related: the CLI scaffold ships `body { color-scheme: light; }`, which overrode
the theme store and left the page light while the grid went dark. It is now
`inherit`.

**AG Grid needs a resolved height** — a flex child alone collapses the row
viewport to zero. Every grid page sets `height: 560px`.

**v33 → v36 differences — do not copy config from the React app:**

| v33 (React) | v36 (Angular) |
| --- | --- |
| `rowSelection="single"` | `rowSelection={{ mode: 'singleRow' }}` |
| `rowSelection="multiple"` | `rowSelection={{ mode: 'multiRow' }}` |
| `.ag-center-cols-container` | `.ag-grid-scrolling-container` |

> **Testing trap.** `.ag-row` elements are position-absolute and recycled, so DOM
> order is **not** visual order. Sort by bounding rect.

**Not ported from React:** `gridPreferences.ts` — per-user column order, width
modes, sort tiers and filter presets have no Angular counterpart.

### Extension Points

- **A new grid:** `columnDefs` + `rowData` + `rowId`.
- **A grid-wide default:** this component.
- **Editable columns:** [`inline-editing.md`](inline-editing.md).
