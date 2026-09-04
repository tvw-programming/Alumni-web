import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { AddToCartState, Availability, ProductCardData } from '../_core/commerce.types';
import { AddToCartButton } from '../add-to-cart-button/add-to-cart-button';
import { PriceTag } from '../price-tag/price-tag';

export type ProductCardLayout = 'grid' | 'list' | 'compact';

/**
 * Product tile: one data model, several layouts.
 *
 * Benchmarks in ./README.md — Amazon and Flipkart for the dense scan path,
 * Myntra for image-led fashion browsing.
 *
 * The accessibility decision that shapes the markup: **the card is not one
 * giant link.** The brief is explicit about this, and it matters because a
 * whole-card anchor swallows the wishlist and cart buttons inside it, leaving a
 * screen-reader user with one control whose name is the entire card. Here the
 * title is the link, and the actions are siblings.
 *
 * Composition over configuration: price rendering belongs to `PriceTag` and the
 * action to `AddToCartButton`. This component decides layout and scan order and
 * delegates the rest, so a pricing rule changes in exactly one place.
 */
@Component({
  selector: 'app-product-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatButtonModule, MatIconModule, PriceTag, AddToCartButton],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  host: { '[class]': '"card card--" + layout()' },
})
export class ProductCard {
  readonly product = input.required<ProductCardData>();
  readonly layout = input<ProductCardLayout>('grid');
  readonly cartState = input<AddToCartState>('idle');
  readonly wishlisted = input(false);
  readonly showDelivery = input(true);

  readonly addToCart = output<string>();
  readonly toggleWishlist = output<string>();
  readonly chooseOptions = output<string>();
  readonly open = output<string>();

  /** Broken-image fallback. A product tile with a blank hole reads as a bug;
   *  an explicit placeholder reads as missing artwork. */
  protected readonly imageFailed = signal(false);
  protected readonly imageLoaded = signal(false);

  protected readonly availabilityLabel = computed(() => {
    const map: Record<Availability, string> = {
      available: '',
      lowStock: 'Only a few left',
      outOfStock: 'Out of stock',
      unknown: '',
    };
    return map[this.product().availability];
  });

  protected readonly isOutOfStock = computed(() => this.product().availability === 'outOfStock');

  protected readonly sponsored = computed(() =>
    (this.product().badges ?? []).some((badge) => badge.tone === 'sponsored'),
  );

  /** Badges other than the sponsored disclosure, which is rendered separately
   *  because it is a legal label rather than merchandising. */
  protected readonly merchandisingBadges = computed(() =>
    (this.product().badges ?? []).filter((badge) => badge.tone !== 'sponsored'),
  );

  /**
   * A delivery promise is only shown once it has been checked for this user's
   * location. The brief forbids the optimistic alternative, and it is the
   * difference between a promise and a guess.
   */
  protected readonly deliveryText = computed(() => {
    const promise = this.product().deliveryPromise;
    if (!this.showDelivery() || !promise) return null;
    return promise.checkedForLocation ? promise.label : 'Check delivery';
  });

  /** Brand, product, price and availability in one name — what a screen-reader
   *  user needs before deciding to open the card. */
  protected readonly linkLabel = computed(() => {
    const product = this.product();
    const parts = [product.brand, product.title].filter(Boolean);
    if (this.availabilityLabel()) parts.push(this.availabilityLabel());
    return parts.join(', ');
  });

  protected readonly wishlistLabel = computed(() =>
    `${this.wishlisted() ? 'Remove' : 'Add'} ${this.product().title} ${this.wishlisted() ? 'from' : 'to'} wishlist`,
  );

  /** Out of stock outranks whatever the caller passed: a card that offers to
   *  add an unavailable item is worse than one that says it is unavailable. */
  protected readonly effectiveCartState = computed<AddToCartState>(() => {
    if (this.isOutOfStock()) return 'outOfStock';
    const variants = this.product().variants;
    if (variants && variants.length > 1 && this.cartState() === 'idle') return 'chooseOptions';
    return this.cartState();
  });
}
