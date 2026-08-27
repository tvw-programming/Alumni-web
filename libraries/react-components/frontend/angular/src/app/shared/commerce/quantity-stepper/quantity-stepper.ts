import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { QuantityConfig } from '../_core/commerce.types';

export type StepperSize = 'compact' | 'regular' | 'large';

/**
 * Plus / value / minus, with the limits supplied rather than inferred.
 *
 * Benchmarks in ./README.md — Blinkit and Instacart for the compact fast-tap
 * form, Amazon for inline editing inside the cart.
 *
 * The component deliberately owns no inventory logic. It is handed
 * server-confirmed `min`, `max` and `disabledReason`, and it reports intent
 * through outputs. A stepper that decides for itself whether stock allows one
 * more is a stepper that disagrees with checkout.
 *
 * Accessibility: the brief forbids bare +/- icons. Both buttons carry the item
 * name ("Increase quantity of Bananas"), the value is a live region so a change
 * is announced, and the reason a limit was hit is announced rather than only
 * implied by a disabled button.
 */
@Component({
  selector: 'app-quantity-stepper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './quantity-stepper.html',
  styleUrl: './quantity-stepper.scss',
  host: { '[class]': '"stepper stepper--" + size()' },
})
export class QuantityStepper {
  readonly config = input.required<QuantityConfig>();
  /** Names the thing being counted, for the button labels. */
  readonly itemName = input('item');
  readonly size = input<StepperSize>('regular');
  readonly readOnly = input(false);

  readonly increment = output<number>();
  readonly decrement = output<number>();
  readonly valueChange = output<number>();
  /** Raised instead of a silent no-op, so the caller can surface the reason. */
  readonly limitReached = output<string>();

  protected readonly busy = computed(() => this.config().updateState === 'loading');

  protected readonly canDecrease = computed(() => {
    const { value, min } = this.config();
    return !this.readOnly() && !this.busy() && value > min;
  });

  protected readonly canIncrease = computed(() => {
    const { value, max } = this.config();
    if (this.readOnly() || this.busy()) return false;
    return max === undefined || value < max;
  });

  /** Fractional units (0.5 kg) must not render as 0.5000000001, and whole
   *  units must not render as "2.0". */
  protected readonly display = computed(() => {
    const { value, step, unit } = this.config();
    const decimals = Number.isInteger(step) ? 0 : String(step).split('.')[1]?.length ?? 1;
    const text = value.toFixed(decimals);
    return unit ? `${text} ${unit}` : text;
  });

  protected readonly decreaseLabel = computed(() =>
    this.config().value <= this.config().min
      ? `Remove ${this.itemName()}`
      : `Decrease quantity of ${this.itemName()}`,
  );

  protected readonly increaseLabel = computed(() => `Increase quantity of ${this.itemName()}`);

  /** Why the control will not go further. Shown and announced — a disabled
   *  button with no explanation is the failure the brief calls out. */
  protected readonly limitMessage = computed(() => {
    const { disabledReason, value, max } = this.config();
    if (disabledReason) return disabledReason;
    if (max !== undefined && value >= max) return `Maximum ${max} per order`;
    return null;
  });

  protected onDecrease(): void {
    const { value, min, step } = this.config();
    if (!this.canDecrease()) {
      const reason = this.limitMessage();
      if (reason) this.limitReached.emit(reason);
      return;
    }
    const next = this.round(Math.max(min, value - step));
    this.decrement.emit(next);
    this.valueChange.emit(next);
  }

  protected onIncrease(): void {
    const { value, max, step } = this.config();
    if (!this.canIncrease()) {
      const reason = this.limitMessage();
      if (reason) this.limitReached.emit(reason);
      return;
    }
    const next = this.round(max === undefined ? value + step : Math.min(max, value + step));
    this.increment.emit(next);
    this.valueChange.emit(next);
  }

  /** Direct entry, clamped to the same bounds as the buttons. */
  protected onInput(raw: string): void {
    const parsed = Number(raw);
    if (Number.isNaN(parsed)) return;
    const { min, max } = this.config();
    const clamped = this.round(Math.min(max ?? Number.POSITIVE_INFINITY, Math.max(min, parsed)));
    this.valueChange.emit(clamped);
  }

  /** Floating-point addition of 0.1 repeatedly drifts; the step's own precision
   *  is the correct place to land. */
  private round(value: number): number {
    const step = this.config().step;
    const decimals = Number.isInteger(step) ? 0 : String(step).split('.')[1]?.length ?? 2;
    return Number(value.toFixed(decimals));
  }
}
