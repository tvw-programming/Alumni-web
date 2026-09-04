import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AppDataGrid } from '../../shared/grid/app-data-grid';
import { GenericCard } from '../../shared/generic-card/generic-card';
import { ProductService } from './product.service';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';
import { currencyFormatter } from '../../core/utils/format';

import type { ColDef } from 'ag-grid-community';
import type { DemoProduct } from './demo-product.types';

/**
 * Read-only products grid — the Angular counterpart of `ProductsReadGrid`.
 *
 * Everything on screen derives from one `httpResource`: rows, the loading
 * overlay and the error message are all `computed` off its signals, so there is
 * no local copy of server state to keep in sync.
 */
@Component({
  selector: 'app-products-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDataGrid,
    GenericCard,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  providers: [ProductService],
  templateUrl: './products-page.html',
  styleUrl: './products-page.scss',
})
export class ProductsPage {
  private readonly service = inject(ProductService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly quickFilter = signal('');

  protected readonly rows = computed(() => this.service.products.value()?.products ?? []);
  protected readonly total = computed(() => this.service.products.value()?.total ?? 0);
  protected readonly isLoading = computed(() => this.service.products.isLoading());

  /**
   * States the loaded count as well as the server total. Showing only the total
   * reads as a claim about what is on screen, and the grid holds one page of it.
   */
  protected readonly subtitle = computed(() => {
    const loaded = this.rows().length;
    const total = this.total();
    const scope = loaded < total ? `${String(loaded)} of ${String(total)}` : String(total);
    return `Read-only grid · ${scope} products`;
  });

  /**
   * The resource exposes the raw failure; it is normalised here so the message
   * matches what every other surface in the app would say for the same error.
   */
  protected readonly errorText = computed(() => {
    const error = this.service.products.error();
    return error ? getUserMessage(normalizeError(error)) : null;
  });

  protected readonly columnDefs: ColDef<DemoProduct>[] = [
    { field: 'title', headerName: 'Title', flex: 2, minWidth: 200 },
    { field: 'brand', headerName: 'Brand' },
    { field: 'category', headerName: 'Category' },
    {
      field: 'price',
      headerName: 'Price',
      type: 'numericColumn',
      // `currencyFormatter` is an Intl.NumberFormat instance, so values go
      // through `.format()` — matching how the React grid formats the column.
      valueFormatter: (params) =>
        typeof params.value === 'number' ? currencyFormatter.format(params.value) : '',
    },
    { field: 'rating', headerName: 'Rating', type: 'numericColumn' },
    { field: 'stock', headerName: 'Stock', type: 'numericColumn' },
  ];

  protected readonly rowId = (row: DemoProduct): string => String(row.id);

  protected reload(): void {
    this.service.products.reload();
    this.snackbar.info('Reloading products…');
  }

  protected onRowClicked(product: DemoProduct): void {
    this.snackbar.info(`${product.title} — ${currencyFormatter.format(product.price)}`);
  }
}
