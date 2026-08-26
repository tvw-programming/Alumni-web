import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { FieldBase } from './field-shell';

/**
 * Many-of-N, stored as a string array.
 *
 * The control holds an array rather than one boolean per option, because that
 * is the shape the API takes and the shape the schema declares. Toggling writes
 * a *new* array rather than mutating in place — Angular compares by reference,
 * so an in-place `push` would not notify anything.
 */
@Component({
  selector: 'app-checkbox-group-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatCheckboxModule],
  template: `
    <fieldset class="group">
      <legend class="group__legend">
        {{ field().label }}@if (isRequired()) {<span aria-hidden="true"> *</span>}
      </legend>
      <div class="group__options">
        @for (option of field().options ?? []; track option.value) {
          <mat-checkbox
            [checked]="selected().includes(option.value)"
            (change)="toggle(option.value, $any($event).checked)"
          >
            {{ option.label }}
          </mat-checkbox>
        }
      </div>
      @if (errorText()) {
        <p class="group__error" role="alert">{{ errorText() }}</p>
      } @else if (field().hint) {
        <p class="group__hint">{{ field().hint }}</p>
      }
    </fieldset>
  `,
  styles: `
    .group { border: 0; padding: 0; margin: 0 0 16px; }
    .group__legend {
      padding: 0;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .group__options { display: flex; flex-wrap: wrap; gap: 12px; }
    .group__error { margin: 4px 0 0; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
    .group__hint {
      margin: 4px 0 0;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
  `,
})
export class CheckboxGroupField extends FieldBase {
  protected readonly selected = computed<string[]>(() => {
    const value: unknown = this.control().value;
    return Array.isArray(value) ? (value as string[]) : [];
  });

  protected toggle(value: string, checked: boolean): void {
    const current = this.selected();
    // A new array, not `current.push(...)`: Angular compares by reference and
    // an in-place mutation would leave every consumer looking at stale state.
    const next = checked ? [...current, value] : current.filter((item) => item !== value);
    this.control().setValue(next);
    this.control().markAsTouched();
    this.control().markAsDirty();
  }
}
