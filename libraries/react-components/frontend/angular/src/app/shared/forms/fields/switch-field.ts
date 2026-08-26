import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { FieldBase } from './field-shell';

@Component({
  selector: 'app-switch-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatSlideToggleModule],
  template: `
    <div class="field">
      <mat-slide-toggle [formControl]="control()">{{ field().label }}</mat-slide-toggle>
      @if (field().hint) {
        <p class="field__hint">{{ field().hint }}</p>
      }
    </div>
  `,
  styles: `
    .field { width: 100%; margin: 8px 0 16px; }
    .field__hint { color: var(--mat-sys-on-surface-variant); font: var(--mat-sys-body-small); margin: 4px 0 0; }
  `,
})
export class SwitchField extends FieldBase {}
