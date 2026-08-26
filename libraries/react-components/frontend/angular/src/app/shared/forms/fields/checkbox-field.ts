import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { FieldBase } from './field-shell';

@Component({
  selector: 'app-checkbox-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatCheckboxModule],
  template: `
    <div class="field">
      <mat-checkbox [formControl]="control()">{{ field().label }}</mat-checkbox>
      @if (errorText()) {
        <p class="field__error">{{ errorText() }}</p>
      } @else if (field().hint) {
        <p class="field__hint">{{ field().hint }}</p>
      }
    </div>
  `,
  styles: `
    .field { width: 100%; margin: 8px 0 16px; }
    .field__error { color: var(--mat-sys-error); font: var(--mat-sys-body-small); margin: 4px 0 0; }
    .field__hint { color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-small); margin: 4px 0 0; }
  `,
})
export class CheckboxField extends FieldBase {}
