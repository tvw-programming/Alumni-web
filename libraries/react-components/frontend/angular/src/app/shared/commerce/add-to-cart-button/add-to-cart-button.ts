import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { AddToCartState } from '../_core/commerce.types';

export type AddToCartVariant = 'primary' | 'compact' | 'floating';

/**
 * The primary commerce action, as an explicit state machine.
 *
 * Benchmarks in ./README.md — Amazon and Flipkart for the strong primary action
 * beside product information, Blinkit for immediate add on grocery cards.
 *
 * The rule the brief states and this component enforces: **success is received,
 * never inferred.** `state` is an input, so the button cannot flip to "Added"
 * because someone clicked it. If the cart service rejects the mutation the
 * button never lied.
 *
 * `chooseOptions` exists so a required size is never silently defaulted — the
 * click routes to the variant selector instead of adding the wrong thing.
 */
@Component({
  selector: 'app-add-to-cart-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './add-to-cart-button.html',
  styleUrl: './add-to-cart-button.scss',
  host: { '[class]': '"atc atc--" + variant()' },
})
export class AddToCartButton {
  readonly state = input<AddToCartState>('idle');
  readonly productTitle = input('this item');
  readonly variant = input<AddToCartVariant>('primary');
  /** Overrides the state's default wording where a surface needs its own. */
  readonly label = input<string>();

  readonly add = output<void>();
  readonly viewCart = output<void>();
  readonly chooseOptions = output<void>();
  readonly retry = output<void>();
  readonly notifyMe = output<void>();

  protected readonly busy = computed(() => this.state() === 'loading');

  protected readonly disabled = computed(() => {
    const state = this.state();
    return state === 'loading' || state === 'disabled';
  });

  protected readonly text = computed(() => {
    const override = this.label();
    if (override) return override;
    switch (this.state()) {
      case 'loading': return 'Updating cart';
      case 'added': return 'Added';
      case 'chooseOptions': return 'Choose options';
      case 'outOfStock': return 'Notify me';
      case 'error': return 'Try again';
      case 'disabled': return 'Unavailable';
      default: return 'Add to cart';
    }
  });

  protected readonly icon = computed(() => {
    switch (this.state()) {
      case 'added': return 'check';
      case 'chooseOptions': return 'tune';
      case 'outOfStock': return 'notifications_none';
      case 'error': return 'refresh';
      default: return 'add_shopping_cart';
    }
  });

  /** The button's own text is "Add to cart" on every card in a grid; the
   *  accessible name has to say which product. */
  protected readonly accessibleName = computed(() => `${this.text()}: ${this.productTitle()}`);

  /**
   * Announced on transition. Deliberately a persistent status rather than a
   * toast — the brief warns against confirmation that disappears before it has
   * been read.
   */
  protected readonly announcement = computed(() => {
    switch (this.state()) {
      case 'added': return `${this.productTitle()} added to cart`;
      case 'outOfStock': return `${this.productTitle()} is sold out`;
      case 'error': return `Could not add ${this.productTitle()} to cart`;
      case 'chooseOptions': return 'Select an option before adding to cart';
      default: return '';
    }
  });

  /** One click handler, routed by state: the same tap means different things,
   *  and letting each caller work that out is how "Try again" ends up adding a
   *  second copy of the item. */
  protected onClick(): void {
    switch (this.state()) {
      case 'added': this.viewCart.emit(); break;
      case 'chooseOptions': this.chooseOptions.emit(); break;
      case 'outOfStock': this.notifyMe.emit(); break;
      case 'error': this.retry.emit(); break;
      case 'idle': this.add.emit(); break;
      default: break; // loading and disabled do nothing
    }
  }
}
