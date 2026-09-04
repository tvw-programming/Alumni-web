import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

import { FieldBase } from './field-shell';

import type { FieldOption } from '../form.types';

/**
 * Multi-select with type-ahead, stored as a string array.
 *
 * Chips for what is chosen, a filtered list for what is not. Free text is
 * deliberately *not* accepted: the values map to a database CHECK, so inventing
 * one here would only produce a write the API rejects.
 */
@Component({
  selector: 'app-autocomplete-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatAutocompleteModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  template: `
    <mat-form-field appearance="outline" class="auto">
      <mat-label>{{ field().label }}</mat-label>

      <mat-chip-grid #chips [attr.aria-label]="field().label">
        @for (value of selected(); track value) {
          <mat-chip-row (removed)="remove(value)">
            {{ labelFor(value) }}
            <button matChipRemove [attr.aria-label]="'Remove ' + labelFor(value)">
              <mat-icon>cancel</mat-icon>
            </button>
          </mat-chip-row>
        }
      </mat-chip-grid>

      <input
        [placeholder]="field().placeholder ?? 'Start typing…'"
        [matChipInputFor]="chips"
        [matAutocomplete]="auto"
        [value]="term()"
        (input)="term.set($any($event.target).value)"
      />

      <mat-autocomplete #auto="matAutocomplete" (optionSelected)="add($any($event).option.value)">
        @for (option of available(); track option.value) {
          <mat-option [value]="option.value">{{ option.label }}</mat-option>
        }
      </mat-autocomplete>

      @if (errorText()) {
        <mat-error>{{ errorText() }}</mat-error>
      } @else if (field().hint) {
        <mat-hint>{{ field().hint }}</mat-hint>
      }
    </mat-form-field>
  `,
  styles: `.auto { width: 100%; }`,
})
export class AutocompleteField extends FieldBase {
  protected readonly term = signal('');

  protected readonly selected = computed<string[]>(() => {
    const value: unknown = this.control().value;
    return Array.isArray(value) ? (value as string[]) : [];
  });

  /** Options not already chosen, narrowed by what has been typed. */
  protected readonly available = computed<readonly FieldOption[]>(() => {
    const chosen = new Set(this.selected());
    const needle = this.term().trim().toLowerCase();
    return (this.field().options ?? []).filter(
      (option) => !chosen.has(option.value) && option.label.toLowerCase().includes(needle),
    );
  });

  protected labelFor(value: string): string {
    return this.field().options?.find((option) => option.value === value)?.label ?? value;
  }

  protected add(value: string): void {
    if (this.selected().includes(value)) return;
    this.write([...this.selected(), value]);
    this.term.set('');
  }

  protected remove(value: string): void {
    this.write(this.selected().filter((item) => item !== value));
  }

  private write(next: string[]): void {
    // A new array each time: Angular compares by reference.
    this.control().setValue(next);
    this.control().markAsTouched();
    this.control().markAsDirty();
  }
}
