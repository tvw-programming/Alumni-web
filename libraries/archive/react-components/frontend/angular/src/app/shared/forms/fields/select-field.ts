import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';

import { FieldBase } from './field-shell';

@Component({
  selector: 'app-select-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule],
  template: `
    <mat-form-field appearance="outline" class="field">
      <mat-label>{{ field().label }}</mat-label>
      <mat-select [formControl]="control()" [required]="isRequired()">
        @for (option of field().options ?? []; track option.value) {
          <mat-option [value]="option.value">{{ option.label }}</mat-option>
        }
      </mat-select>
      @if (errorText()) {
        <mat-error>{{ errorText() }}</mat-error>
      } @else if (field().hint) {
        <mat-hint>{{ field().hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `.field { width: 100%; }`,
})
export class SelectField extends FieldBase {}
