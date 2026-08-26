import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

import { FieldBase } from './field-shell';

const MAX_STARS = 5;

/**
 * Star rating.
 *
 * The stars are real `<button>`s inside a labelled group, so the control is
 * operable by keyboard and announced as a set — a row of clickable `<span>`s
 * would be neither. `aria-pressed` carries the state; the visual fill is
 * decoration on top of it.
 */
@Component({
  selector: 'app-rating-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
  template: `
    <div class="rating">
      <span class="rating__label" [id]="field().name + '-label'">
        {{ field().label }}@if (isRequired()) {<span aria-hidden="true"> *</span>}
      </span>
      <div class="rating__stars" role="group" [attr.aria-labelledby]="field().name + '-label'">
        @for (star of stars; track star) {
          <button
            type="button"
            class="rating__star"
            [attr.aria-label]="star + ' of ' + max"
            [attr.aria-pressed]="star <= current()"
            (click)="choose(star)"
          >
            <mat-icon>{{ star <= current() ? 'star' : 'star_border' }}</mat-icon>
          </button>
        }
        <span class="rating__value">{{ current() || '—' }}</span>
      </div>
      @if (errorText()) {
        <p class="rating__error" role="alert">{{ errorText() }}</p>
      }
    </div>
  `,
  styles: `
    .rating { margin-bottom: 16px; }
    .rating__label {
      display: block;
      margin-bottom: 4px;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .rating__stars { display: flex; align-items: center; gap: 2px; }
    .rating__star {
      display: grid;
      place-items: center;
      padding: 2px;
      border: 0;
      background: transparent;
      color: var(--mat-sys-tertiary);
      cursor: pointer;
    }
    .rating__star:focus-visible { outline: 2px solid var(--mat-sys-primary); border-radius: 4px; }
    .rating__value {
      margin-left: 8px;
      color: var(--mat-sys-on-surface-variant);
      font-variant-numeric: tabular-nums;
    }
    .rating__error { margin: 4px 0 0; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
  `,
})
export class RatingField extends FieldBase {
  protected readonly max = MAX_STARS;
  protected readonly stars = Array.from({ length: MAX_STARS }, (_, i) => i + 1);

  protected readonly current = computed(() => Number(this.control().value) || 0);

  protected choose(value: number): void {
    // Clicking the current value clears it — otherwise a rating given by
    // accident can never be taken back.
    this.control().setValue(this.current() === value ? 0 : value);
    this.control().markAsTouched();
    this.control().markAsDirty();
  }
}
