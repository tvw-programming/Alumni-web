import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { GenericCard } from '../../shared/generic-card/generic-card';
import { SchemaForm } from '../../shared/forms/schema-form';
import { SnackbarService } from '../../shared/snackbar/snackbar.service';
import { getUserMessage, normalizeError } from '../../core/errors/normalize-error';

import type { FormSchema, FormValues } from '../../shared/forms/form.types';

/**
 * Order Form — the schema-driven form engine fed by a schema fetched at runtime.
 *
 * The Product Form's schema is written in TypeScript, which is convenient but
 * proves nothing: a schema in code could always have been a component. This one
 * is `public/schemas/order-form.json`, loaded over HTTP, so the claim that
 * `FormSchema` is plain data is demonstrated rather than asserted — the form
 * below is rendered from bytes the build has never seen.
 *
 * That is also why the schema is validated before use. It arrives from outside
 * the bundle, so "it typechecked" says nothing about it.
 */
@Component({
  selector: 'app-order-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GenericCard, SchemaForm],
  template: `
    <app-generic-card
      title="Order Form"
      subtitle="Rendered from a JSON schema fetched at runtime"
      icon="receipt_long"
      [loading]="schema.isLoading()"
      [error]="errorText()"
      [showRetry]="true"
      (retry)="schema.reload()"
    >
      @if (validSchema(); as formSchema) {
        <app-schema-form
          [schema]="formSchema"
          [defaultValues]="defaults"
          [submitting]="submitting()"
          (formSubmit)="onSubmit($event)"
          (invalidSubmit)="onInvalid($event)"
        />
      }
    </app-generic-card>
  `,
  styles: `:host { display: block; padding: 16px 0; }`,
})
export class OrderFormPage {
  private readonly snackbar = inject(SnackbarService);

  protected readonly submitting = signal(false);

  /** Relative URL, so the interceptor treats it as our own origin. */
  protected readonly schema = httpResource(() => ({ url: '/schemas/order-form.json' }));

  /**
   * The fetched schema, or null if it is not one.
   *
   * A malformed schema would otherwise surface as a render-time crash inside
   * the form engine, where the cause is no longer visible.
   */
  protected readonly validSchema = computed<FormSchema | null>(() => {
    const value = this.schema.value();
    return isFormSchema(value) ? value : null;
  });

  protected readonly errorText = computed(() => {
    const error = this.schema.error();
    if (error) return getUserMessage(normalizeError(error));
    // Loaded, but not a schema.
    if (!this.schema.isLoading() && this.schema.value() !== undefined && !this.validSchema()) {
      return 'The order form schema could not be read. It may be malformed.';
    }
    return null;
  });

  protected readonly defaults: FormValues = { status: 'pending', expedited: false };

  protected onSubmit(values: FormValues): void {
    this.submitting.set(true);
    // No order endpoint exists; the submit path is what is demonstrated.
    setTimeout(() => {
      this.submitting.set(false);
      this.snackbar.success(`Order ${String(values['orderId'])} would be created`);
    }, 400);
  }

  protected onInvalid(fields: string[]): void {
    this.snackbar.error(`Fix these fields first: ${fields.join(', ')}`);
  }
}

/** One field, checked the same way — the array's element type is unknown too. */
function isFieldConfig(field: unknown): boolean {
  if (typeof field !== 'object' || field === null) return false;
  const candidate = field as Record<string, unknown>;
  return (
    typeof candidate['name'] === 'string' &&
    typeof candidate['label'] === 'string' &&
    typeof candidate['type'] === 'string'
  );
}

/** Structural check on data that came from outside the bundle. */
function isFormSchema(value: unknown): value is FormSchema {
  if (typeof value !== 'object' || value === null) return false;
  const schema = value as { fields?: unknown };
  const fields: unknown = schema.fields;
  if (!Array.isArray(fields) || fields.length === 0) return false;
  return (fields as unknown[]).every(isFieldConfig);
}
