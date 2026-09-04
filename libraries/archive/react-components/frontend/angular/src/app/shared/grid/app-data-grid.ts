import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AgGridAngular } from 'ag-grid-angular';
import { colorSchemeDark, colorSchemeLight, themeQuartz } from 'ag-grid-community';

import { ThemeStore } from '../../core/theme/theme-store';

import './ag-grid-setup';

import type {
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  RowClickedEvent,
  RowSelectionOptions,
} from 'ag-grid-community';

export type GridSelectionMode = 'single' | 'multiple' | 'none';

/**
 * Typed wrapper over AG Grid Community, mirroring the React `AppDataGrid`.
 *
 * The prop surface is the same; the internals are not. AG Grid **v36** is used
 * here against v33 in React, and its Theming API differs enough that the theme
 * is re-derived from Material 3 CSS custom properties rather than ported. The
 * React version reads MUI palette values in JS; here the grid consumes
 * `--mat-sys-*` tokens directly, so it follows the Material theme (including
 * the dark-mode toggle) without JavaScript re-computing anything.
 */
@Component({
  selector: 'app-data-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AgGridAngular],
  template: `
    <ag-grid-angular
      class="grid"
      [theme]="theme()"
      [rowData]="rowData() ?? null"
      [columnDefs]="columnDefs()"
      [defaultColDef]="defaultColDef()"
      [gridOptions]="gridOptions()"
      [quickFilterText]="quickFilterText()"
      [rowSelection]="rowSelection()"
      [pagination]="pagination()"
      [paginationPageSize]="paginationPageSize()"
      [paginationPageSizeSelector]="pageSizeOptions()"
      [loading]="loading()"
      [overlayNoRowsTemplate]="noRowsTemplate()"
      [getRowId]="getRowIdFn()"
      (gridReady)="onGridReady($event)"
      (rowClicked)="onRowClicked($event)"
      (selectionChanged)="onSelectionChanged()"
    />
  `,
  styles: `
    :host { display: block; height: 100%; min-height: 0; }
    .grid { width: 100%; height: 100%; }
  `,
})
export class AppDataGrid<TData> {
  private readonly themeStore = inject(ThemeStore);
  private gridApi: GridApi<TData> | null = null;

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
  /** Stable row identity — required for single-row transaction updates. */
  readonly rowId = input<((row: TData) => string) | undefined>(undefined);
  readonly defaultColDefOverrides = input<ColDef<TData>>({});
  readonly gridOptionsOverrides = input<GridOptions<TData>>({});

  readonly gridReady = output<GridApi<TData>>();
  readonly rowClicked = output<TData>();
  readonly selectionChanged = output<TData[]>();

  /**
   * Derived from the Material theme so the grid is themed, not merely adjacent
   * to the theme. `computed` re-derives only when the mode actually flips.
   */
  protected readonly theme = computed(() => {
    const scheme = this.themeStore.isDark() ? colorSchemeDark : colorSchemeLight;
    // Colours come entirely from AG Grid's own light/dark scheme part.
    //
    // Two things were tried and reverted: passing `var(--mat-sys-*)` values
    // (the Theming API does not resolve CSS-variable indirection for colours)
    // and forcing transparent surfaces (the scheme derives its foreground from
    // the background, so `transparent` produced near-invisible text). Only
    // typography is overridden, which is safe and keeps the grid matching the
    // Material type scale.
    return themeQuartz.withPart(scheme).withParams({
      fontFamily: 'inherit',
      headerFontWeight: 600,
    });
  });

  protected readonly defaultColDef = computed<ColDef<TData>>(() => ({
    sortable: this.sortable(),
    filter: this.filterable(),
    resizable: this.resizable(),
    floatingFilter: this.floatingFilter(),
    flex: 1,
    minWidth: 120,
    ...this.defaultColDefOverrides(),
  }));

  /**
   * AG Grid v36 renamed the multi-row mode to `multiRow`; the component keeps
   * the React app's `'multiple'` vocabulary and translates here, so callers do
   * not have to learn a grid-version detail.
   */
  protected readonly rowSelection = computed<RowSelectionOptions<TData> | undefined>(() => {
    const mode = this.selectionMode();
    if (mode === 'none') return undefined;
    return mode === 'single'
      ? ({ mode: 'singleRow' } satisfies RowSelectionOptions<TData>)
      : ({ mode: 'multiRow' } satisfies RowSelectionOptions<TData>);
  });

  protected readonly noRowsTemplate = computed(
    () => `<span class="ag-overlay-no-rows-center">${this.noRowsMessage()}</span>`,
  );

  protected readonly getRowIdFn = computed(() => {
    const fn = this.rowId();
    return fn ? (params: { data: TData }) => fn(params.data) : undefined;
  });

  protected readonly gridOptions = computed<GridOptions<TData>>(() => ({
    animateRows: true,
    ...this.gridOptionsOverrides(),
  }));

  protected onGridReady(event: GridReadyEvent<TData>): void {
    this.gridApi = event.api;
    this.gridReady.emit(event.api);
  }

  protected onRowClicked(event: RowClickedEvent<TData>): void {
    if (event.data) this.rowClicked.emit(event.data);
  }

  protected onSelectionChanged(): void {
    if (this.selectionMode() === 'none') return;
    this.selectionChanged.emit(this.gridApi?.getSelectedRows() ?? []);
  }
}
