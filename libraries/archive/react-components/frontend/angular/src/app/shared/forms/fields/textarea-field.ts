import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { FieldBase } from './field-shell';

@Component({
  selector: 'app-textarea-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule],
  template: `
    <mat-form-field appearance="outline" class="field">
      <mat-label>{{ field().label }}</mat-label>
      <textarea
        matInput
        [formControl]="control()"
        [rows]="field().rows ?? 4"
        [placeholder]="field().placeholder ?? ''"
        [required]="isRequired()"
      ></textarea>
      @if (errorText()) {
        <mat-error>{{ errorText() }}</mat-error>
      } @else if (field().hint) {
        <mat-hint>{{ field().hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `.field { width: 100%; }`,
})
export class TextareaField extends FieldBase {}
