import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FieldBase } from './field-shell';

/**
 * Covers every plain `<input type="...">`: text, email, password, number, tel,
 * url, search, date, time and friends. They differ only by the type attribute,
 * so a component each would be duplication — the same decision the React
 * registry makes with its PASSTHROUGH_TYPES list.
 */
@Component({
  selector: 'app-text-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="field">
      <mat-label>{{ field().label }}</mat-label>
      <input
        matInput
        [type]="field().type"
        [formControl]="control()"
        [placeholder]="field().placeholder ?? ''"
        [required]="isRequired()"
      />
      @if (errorText()) {
        <mat-error>{{ errorText() }}</mat-error>
      } @else if (field().hint) {
        <mat-hint>{{ field().hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `.field { width: 100%; }`,
})
export class TextField extends FieldBase {}
