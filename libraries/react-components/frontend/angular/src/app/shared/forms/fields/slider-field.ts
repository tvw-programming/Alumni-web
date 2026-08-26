import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { MatSliderModule } from '@angular/material/slider';
import { ReactiveFormsModule } from '@angular/forms';

import { FieldBase } from './field-shell';

/** Bounded number chosen by dragging, with the value shown as text beside it. */
@Component({
  selector: 'app-slider-field',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatSliderModule],
  template: `
    <div class="slider">
      <label class="slider__label" [for]="field().name + '-input'">
        {{ field().label }}@if (isRequired()) {<span aria-hidden="true"> *</span>}
        <span class="slider__value">{{ control().value }}</span>
      </label>
      <mat-slider [min]="min()" [max]="max()" [step]="step()" discrete>
        <input matSliderThumb [id]="field().name + '-input'" [formControl]="control()" />
      </mat-slider>
      @if (errorText()) {
        <p class="slider__error" role="alert">{{ errorText() }}</p>
      } @else if (field().hint) {
        <p class="slider__hint">{{ field().hint }}</p>
      }
    </div>
  `,
  styles: `
    .slider { margin-bottom: 16px; }
    .slider__label {
      display: flex;
      justify-content: space-between;
      color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-body-small);
    }
    .slider__value { font-variant-numeric: tabular-nums; color: var(--mat-sys-on-surface); }
    mat-slider { width: 100%; }
    .slider__error { margin: 4px 0 0; color: var(--mat-sys-error); font: var(--mat-sys-body-small); }
    .slider__hint { margin: 4px 0 0; font: var(--mat-sys-body-small); }
  `,
})
export class SliderField extends FieldBase {
  // Defaults matter: a slider with no bounds renders 0–100 and silently
  // disagrees with whatever the API accepts.
  protected readonly min = computed(() => this.field().validation?.min ?? 0);
  protected readonly max = computed(() => this.field().validation?.max ?? 100);
  protected readonly step = computed(() => this.field().step ?? 1);
}
