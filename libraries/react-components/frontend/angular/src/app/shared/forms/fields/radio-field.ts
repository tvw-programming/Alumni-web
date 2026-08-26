import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatRadioModule } from '@angular/material/radio';

import { FieldBase } from './field-shell';

/**
 * Single choice from a small, always-visible set.
 *
 * A radio group rather than a select when the options are few: showing all of
 * them costs nothing and saves a click, and the grouping is announced properly
 * because `mat-radio-group` carries the role.
 */
@Component({
  selector: 'app-radio-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatRadioModule],
  template: `
    <fieldset class="radio">
      <legend class="radio__legend">
        {{ field().label }}@if (isRequired()) {<span aria-hidden="true"> *</span>}
      </legend>
      <mat-radio-group [formControl]="control()" class="radio__group">
        @for (option of field().options ?? []; track option.value) {
          <mat-radio-button [value]="option.value">{{ option.label }}</mat-radio-button>
        }
      </mat-radio-group>
      @if (errorText()) {
        <p class="radio__error" role="alert">{{ errorText() }}</p>
      } @else if (field().hint) {
        <p class="radio__hint">{{ field().hint }}</p>
      }
    </fieldset>
  `,
  styles: `
    .radio { border: 0; padding: 0; margin: 0 0 16px; }
    .radio__legend {
      padding: 0;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .radio__group { display: flex; flex-wrap: wrap; gap: 12px; }
    .radio__error { margin: 4px 0 0; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
    .radio__hint {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class RadioField extends FieldBase {}
