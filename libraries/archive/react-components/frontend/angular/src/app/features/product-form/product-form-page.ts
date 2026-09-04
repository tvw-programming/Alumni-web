import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { SchemaForm } from '../../shared/forms/schema-form';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';

import type { FormSchema, FormValues } from '../../shared/forms/form.types';

/**
 * Schema-driven product form — the Angular counterpart of `ProductForm`.
 *
 * The schema is plain data, so a new field is one object here and nothing else
 * changes. In the React app this schema is loaded from JSON; the same shape
 * works, since `FormSchema` contains no functions.
 */
@Component({
  selector: 'app-product-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, SchemaForm],
  template: `
    <app-generic-card
      title="Product Form"
      subtitle="Schema-driven, Reactive Forms + Signals"
      icon="list_alt"
    >
      <app-schema-form
        [schema]="schema"
        [defaultValues]="defaults"
        [submitting]="submitting()"
        (formSubmit)="onSubmit($event)"
        (invalidSubmit)="onInvalid($event)"
      />
    </app-generic-card>
  `,
  styles: `:host { display: block; padding: 16px 0; }`,
})
export class ProductFormPage {
  private readonly snackbar = inject(SnackbarService);

  protected readonly submitting = signal(false);

  protected readonly schema: FormSchema = {
    submitLabel: 'Create Product',
    fields: [
      {
        name: 'title',
        label: 'Title',
        type: 'text',
        placeholder: 'Wireless keyboard',
        validation: { required: true, minLength: 3, maxLength: 80 },
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
        options: [
          { value: 'beauty', label: 'Beauty' },
          { value: 'fragrances', label: 'Fragrances' },
          { value: 'furniture', label: 'Furniture' },
          { value: 'groceries', label: 'Groceries' },
        ],
      },
      {
        name: 'description',
        label: 'Description',
        type: 'textarea',
        rows: 4,
        hint: 'Between 10 and 500 characters',
        validation: { minLength: 10, maxLength: 500 },
      },
      { name: 'inStock', label: 'In stock', type: 'checkbox' },
      { name: 'featured', label: 'Feature on the dashboard', type: 'switch' },
    ],
  };

  protected readonly defaults: FormValues = { category: 'beauty', inStock: true };

  protected onSubmit(values: FormValues): void {
    this.submitting.set(true);
    // No create endpoint on the demo API; the submit path is what matters here.
    setTimeout(() => {
      this.submitting.set(false);
      this.snackbar.success(`Product "${String(values['title'])}" would be created`);
    }, 400);
  }

  protected onInvalid(fields: string[]): void {
    this.snackbar.error(`Fix these fields first: ${fields.join(', ')}`);
  }
}
