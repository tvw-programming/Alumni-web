import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { AppDataGrid } from '../../shared/grid/app-data-grid';
import { GenericCard } from '../../shared/generic-card/generic-card';
import { ProductService } from '../products/product.service';
import { SchemaForm } from '../../shared/forms/schema-form';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { StarRatingRenderer } from '../../shared/grid/editing/star-rating-renderer';
import { buildEditableColDefs } from '../../shared/grid/editing/build-editable-col-defs';
import { currencyFormatter } from '../../core/utils/format';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { EditableColumnDef, UpdateStrategy } from '../../shared/grid/editing/editing.types';
import type { FormSchema, FormValues } from '../../shared/forms/form.types';
import type { DemoProduct } from '../products/demo-product.types';

const CATEGORIES = ['beauty', 'fragrances', 'furniture', 'groceries'];

/**
 * Manage DemoProduct (inline edit) — quick-add form beside an editable grid.
 *
 * Every editable column is metadata: `buildEditableColDefs` turns the
 * annotations below into AG Grid editors, so adding a fifth editable column is
 * one object and no new wiring. The update strategy is switchable at runtime
 * because the difference between the two is the whole point of the page:
 *
 * - **Pessimistic** — the grid does not change until the API confirms. A
 *   failure leaves the editor open with the message, ready to retry.
 * - **Optimistic** — the grid changes at once and the request runs behind it. A
 *   failure rolls the row back and says so.
 */
@Component({
  selector: 'app-products-inline-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AppDataGrid,
    GenericCard,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    SchemaForm,
  ],
  providers: [ProductService],
  template: `
    <div class="inline">
      <aside>
        <app-generic-card title="Add product" icon="add_box">
          <app-schema-form
            [schema]="schema"
            [defaultValues]="defaults"
            [submitting]="creating()"
            (formSubmit)="onCreate($event)"
            (invalidSubmit)="onInvalid($event)"
          />
        </app-generic-card>
      </aside>

      <section>
        <app-generic-card
          title="Products (inline edit)"
          [subtitle]="subtitle()"
          icon="edit_note"
          size="expanded"
          [error]="errorText()"
          [showRetry]="true"
          (retry)="reload()"
        >
          <div card-header-action>
            <button matIconButton aria-label="Reload products" (click)="reload()">
              <mat-icon>refresh</mat-icon>
            </button>
          </div>

          <div class="inline__actions">
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="inline__search">
              <mat-label>Quick filter</mat-label>
              <input
                matInput
                type="search"
                [value]="quickFilter()"
                (input)="quickFilter.set($any($event.target).value)"
              />
              <mat-icon matSuffix>search</mat-icon>
            </mat-form-field>

            <mat-button-toggle-group
              [value]="strategy()"
              (change)="strategy.set($any($event).value)"
              aria-label="Update strategy"
              hideSingleSelectionIndicator
            >
              <mat-button-toggle value="pessimistic">Pessimistic</mat-button-toggle>
              <mat-button-toggle value="optimistic">Optimistic</mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <div class="inline__grid">
            <app-data-grid
              [rowData]="rows()"
              [columnDefs]="columnDefs()"
              [loading]="isLoading()"
              [quickFilterText]="quickFilter()"
              [rowId]="rowId"
              [pagination]="true"
              [paginationPageSize]="10"
              noRowsMessage="No products match this filter"
            />
          </div>
        </app-generic-card>
      </section>
    </div>
  `,
  styles: `
    :host { display: block; padding: 16px 0; }
    .inline {
      display: grid;
      grid-template-columns: minmax(240px, 1fr) minmax(0, 3fr);
      gap: 24px;
      align-items: start;
    }
    @media (max-width: 900px) {
      .inline { grid-template-columns: 1fr; }
    }
    .inline__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      margin-bottom: 12px;
    }
    .inline__search { min-width: 240px; }
    /* AG Grid needs a resolved height; a flex child alone collapses to zero. */
    .inline__grid { height: 560px; }
  `,
})
export class ProductsInlinePage {
  private readonly service = inject(ProductService);
  private readonly snackbar = inject(SnackbarService);

  protected readonly quickFilter = signal('');
  protected readonly strategy = signal<UpdateStrategy>('pessimistic');
  protected readonly creating = signal(false);

  /** Products added in this session, newest first. See `UsersPage.createdUsers`. */
  private readonly createdProducts = signal<DemoProduct[]>([]);

  protected readonly rows = computed(() => [
    ...this.createdProducts(),
    ...(this.service.products.value()?.products ?? []),
  ]);
  protected readonly total = computed(
    () => (this.service.products.value()?.total ?? 0) + this.createdProducts().length,
  );
  protected readonly isLoading = computed(() => this.service.products.isLoading());

  /**
   * States the loaded count *and* the server total.
   *
   * Showing only the total reads as a claim about what is on screen, and the
   * grid holds one page of it — a reader counting rows would conclude the grid
   * was broken.
   */
  protected readonly subtitle = computed(() => {
    const loaded = this.rows().length;
    const total = this.total();
    const scope = loaded < total ? `${String(loaded)} of ${String(total)}` : String(total);
    return `${scope} products · click the pencil in a cell`;
  });

  protected readonly errorText = computed(() => {
    const error = this.service.products.error();
    return error ? getUserMessage(normalizeError(error)) : null;
  });

  private readonly editableColumns: EditableColumnDef<DemoProduct>[] = [
    { field: 'id', headerName: 'ID', maxWidth: 90, flex: 0 },
    {
      field: 'title',
      headerName: 'Title',
      flex: 2,
      minWidth: 200,
      inlineEditable: true,
      editorType: 'text',
      validation: { required: true, minLength: 2, maxLength: 80 },
    },
    { field: 'brand', headerName: 'Brand' },
    {
      field: 'category',
      headerName: 'Category',
      inlineEditable: true,
      editorType: 'dropdown',
      optionsKey: 'categories',
      // The API echoes the whole product, so the row is replaced wholesale.
      refreshMode: 'row',
    },
    {
      field: 'price',
      headerName: 'Price',
      type: 'numericColumn',
      inlineEditable: true,
      editorType: 'number',
      validation: { required: true, min: 0, max: 100000 },
      valueFormatter: (params) =>
        typeof params.value === 'number' ? currencyFormatter.format(params.value) : '',
    },
    {
      field: 'rating',
      headerName: 'Rating',
      inlineEditable: true,
      editorType: 'rating',
      validation: { min: 0, max: 5 },
      cellRenderer: StarRatingRenderer,
    },
    { field: 'stock', headerName: 'Stock', type: 'numericColumn' },
  ];

  /**
   * Rebuilt when the strategy changes, because the strategy is baked into each
   * column's editor params — which is also why this is a `computed` rather than
   * a field.
   */
  protected readonly columnDefs = computed(() =>
    buildEditableColDefs(this.editableColumns, {
      saveHandler: async ({ data, field, newValue }) =>
        this.service.update(data.id, { [field]: newValue }),
      optionsMap: { categories: CATEGORIES },
      updateStrategy: this.strategy(),
    }),
  );

  protected readonly schema: FormSchema = {
    submitLabel: 'Add',
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        validation: { required: true, minLength: 2, maxLength: 80 },
      },
      {
        name: 'price',
        label: 'Price (USD)',
        type: 'number',
        validation: { required: true, min: 0, max: 100000 },
      },
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        validation: { required: true },
        options: CATEGORIES.map((value) => ({ value, label: value })),
      },
    ],
  };

  protected readonly defaults: FormValues = { category: 'beauty' };

  protected readonly rowId = (row: DemoProduct): string => String(row.id);

  protected reload(): void {
    this.service.products.reload();
  }

  protected onCreate(values: FormValues): void {
    this.creating.set(true);
    // No create endpoint on the demo API; a local row keeps the grid honest
    // about what actually happened.
    setTimeout(() => {
      this.creating.set(false);
      const created = {
        id: Date.now(),
        title: String(values['title']),
        price: Number(values['price']),
        category: String(values['category']),
        brand: '—',
        rating: 0,
        stock: 0,
      } as DemoProduct;
      this.createdProducts.update((current) => [created, ...current]);
      this.snackbar.success(`Added ${created.title} (local only)`);
    }, 300);
  }

  protected onInvalid(fields: string[]): void {
    this.snackbar.error(`Fix these fields first: ${fields.join(', ')}`);
  }
}
