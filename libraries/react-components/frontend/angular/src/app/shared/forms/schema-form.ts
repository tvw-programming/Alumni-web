import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { logError } from '../../core/errors/error-logger';
import { buildDefaultValues, buildValidators, resolveFieldType } from './field-registry';
import { TextField } from './fields/text-field';

import './fields';

import type { FieldConfig, FieldTypeMap, FormSchema, FormValues } from './form.types';

/**
 * Renders a `FormSchema` as a real Material form over Reactive Forms.
 *
 * The layering matches the React app: the schema is data, this component is the
 * engine bridge, and the field renderers know only Material. A renderer never
 * imports the form engine — it receives a control name and reads the parent
 * `FormGroup` through `ControlContainer`, which is what lets the whole renderer
 * set survive a change of form library.
 *
 * Dynamic rendering uses `NgComponentOutlet` against the registry, so adding a
 * field type never edits this file.
 */
@Component({
  selector: 'app-schema-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, NgComponentOutlet, MatButtonModule, MatProgressSpinnerModule],
  template: `
    <form [formGroup]="form()" (ngSubmit)="submit()" novalidate>
      @for (field of schema().fields; track field.name) {
        <ng-container
          [ngComponentOutlet]="rendererFor(field)"
          [ngComponentOutletInputs]="{ field: field, control: controlFor(field) }"
        />
      }

      <div class="schema-form__actions">
        <button matButton="filled" type="submit" [disabled]="submitting()">
          @if (submitting()) {
            <mat-spinner diameter="16" />
          }
          {{ schema().submitLabel ?? 'Submit' }}
        </button>
      </div>
    </form>
  `,
  styles: `
    :host { display: block; max-width: 560px; }
    .schema-form__actions { display: flex; gap: 8px; margin-top: 8px; }
  `,
})
export class SchemaForm {
  private readonly fb = inject(FormBuilder);

  readonly schema = input.required<FormSchema>();
  readonly defaultValues = input<FormValues>({});
  /** Per-form types, shadowing the global registry. Pass a stable object. */
  readonly fieldTypes = input<FieldTypeMap>();
  readonly submitting = input(false);

  readonly formSubmit = output<FormValues>();
  /**
   * Emitted when the engine blocked submission, with the invalid field names.
   *
   * Named `invalidSubmit`, not `invalid`: `invalid` is a native DOM event, and
   * an output sharing its name makes `(invalid)` ambiguous at the call site.
   */
  readonly invalidSubmit = output<string[]>();

  private readonly formSignal = computed(() => this.buildForm());
  protected form(): FormGroup {
    return this.formSignal();
  }

  protected controlFor(field: FieldConfig): FormControl {
    return this.form().get(field.name) as FormControl;
  }

  protected rendererFor(field: FieldConfig) {
    // An unknown type degrades to a text input rather than rendering nothing —
    // a schema typo should be visible and editable, not an invisible gap.
    return resolveFieldType(field.type, this.fieldTypes())?.render ?? TextField;
  }

  protected submit(): void {
    const form = this.form();
    if (form.invalid) {
      // Touch everything so the errors the user has not seen yet appear.
      form.markAllAsTouched();
      const invalidFields = Object.entries(form.controls)
        .filter(([, control]) => control.invalid)
        .map(([name]) => name);

      logError({
        channel: 'app',
        level: 'warning',
        fileName: 'schema-form.ts',
        error: 'FORM_VALIDATION_BLOCKED',
        errorDescription: `Submission blocked; invalid fields: ${invalidFields.join(', ')}`,
        context: { kind: 'form', invalidFields },
      });

      this.invalidSubmit.emit(invalidFields);
      return;
    }
    this.formSubmit.emit(form.getRawValue() as FormValues);
  }

  private buildForm(): FormGroup {
    const fields = this.schema().fields;
    const types = this.fieldTypes();
    const values = buildDefaultValues(fields, this.defaultValues(), types);

    const controls: Record<string, unknown[]> = {};
    for (const field of fields) {
      const definition = resolveFieldType(field.type, types);
      controls[field.name] = [
        { value: values[field.name], disabled: field.disabled ?? false },
        buildValidators(field, definition),
      ];
    }
    return this.fb.group(controls);
  }
}
