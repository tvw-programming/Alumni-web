import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { ReactiveFormsModule } from '@angular/forms';

import { FieldBase } from './field-shell';

/**
 * Single choice rendered as a segmented control.
 *
 * Same semantics as `radio`, different affordance: used where the options are
 * mutually exclusive *states* (in stock / pre-order / discontinued) rather than
 * a list to read through.
 */
@Component({
  selector: 'app-toggle-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatButtonToggleModule],
  template: `
    <div class="toggle">
      <span class="toggle__label" [id]="field().name + '-label'">
        {{ field().label }}@if (isRequired()) {<span aria-hidden="true"> *</span>}
      </span>
      <mat-button-toggle-group
        [formControl]="control()"
        [attr.aria-labelledby]="field().name + '-label'"
        hideSingleSelectionIndicator
      >
        @for (option of field().options ?? []; track option.value) {
          <mat-button-toggle [value]="option.value">{{ option.label }}</mat-button-toggle>
        }
      </mat-button-toggle-group>
      @if (errorText()) {
        <p class="toggle__error" role="alert">{{ errorText() }}</p>
      }
    </div>
  `,
  styles: `
    .toggle { margin-bottom: 16px; }
    .toggle__label {
      display: block;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .toggle__error { margin: 4px 0 0; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
  `,
})
export class ToggleField extends FieldBase {}
