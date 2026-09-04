import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { PriceModel } from '../_core/commerce.types';
import { discountPercent, formatMoney, priceAnnouncement } from '../_core/money';

export type PriceSize = 'sm' | 'md' | 'lg';
export type PriceLayout = 'inline' | 'stacked';

/**
 * Price hierarchy: selling price, reference price, discount, qualifiers.
 *
 * Benchmarks — see ./README.md. Amazon and Flipkart for the scan order
 * (largest darkest current price, smaller struck-through MRP, compact discount
 * label); Myntra for the prominence of the percentage in fashion listings.
 *
 * Three decisions worth stating, because each one is a bug if reversed:
 *
 * - **The percentage is computed once, in `money.ts`, and floored.** Rounding
 *   49.6% up to "50% off" writes a cheque the checkout total cannot cash.
 * - **The whole block is one `aria-label` and the parts are `aria-hidden`.**
 *   Left to itself a screen reader reads "1,499 2,499 40% off" — three numbers
 *   with no relationship. The label says the sentence the brief specifies.
 * - **Discount is never colour alone.** The label carries text ("40% OFF"), so
 *   the meaning survives greyscale and colour-blindness.
 */
@Component({
  selector: 'app-price-tag',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './price-tag.html',
  styleUrl: './price-tag.scss',
  host: {
    '[class]': '"price-tag price-tag--" + size() + " price-tag--" + layout()',
  },
})
export class PriceTag {
  readonly price = input.required<PriceModel>();
  readonly size = input<PriceSize>('md');
  readonly layout = input<PriceLayout>('inline');
  readonly showDiscount = input(true);
  readonly locale = input('en-IN');

  protected readonly selling = computed(() => formatMoney(this.price().sellingPrice, this.locale()));

  /** Rendered only when it is genuinely a different, higher number. An MRP equal
   *  to the selling price is the "no discount" case, not a struck-through
   *  duplicate of the price beside it. */
  protected readonly compareAt = computed(() => {
    const { sellingPrice, compareAtPrice } = this.price();
    if (!compareAtPrice) return null;
    if (compareAtPrice.amountMinor <= sellingPrice.amountMinor) return null;
    return formatMoney(compareAtPrice, this.locale());
  });

  /**
   * An explicit discount from the pricing service wins over one derived from the
   * two prices: the service knows about stacked promotions this component
   * cannot see, and its label is the one checkout will honour.
   */
  protected readonly discountLabel = computed(() => {
    if (!this.showDiscount()) return null;
    const model = this.price();
    if (model.discount) return model.discount.label;

    const percent = discountPercent(model.sellingPrice, model.compareAtPrice);
    return percent === null ? null : `${percent}% OFF`;
  });

  /** Cashback is not a price reduction, so it must not read as one. */
  protected readonly discountIsConditional = computed(() => {
    const applied = this.price().discount?.applied;
    return applied === 'conditional' || applied === 'coupon' || applied === 'cashback';
  });

  protected readonly unitPrice = computed(() => {
    const model = this.price();
    if (!model.unitPrice) return null;
    const amount = formatMoney(model.unitPrice, this.locale());
    return model.unitLabel ? `${amount} per ${model.unitLabel}` : amount;
  });

  protected readonly taxNote = computed(() => {
    switch (this.price().taxMode) {
      case 'included':
        return 'Inclusive of all taxes';
      case 'excluded':
        return 'Plus taxes';
      default:
        return null;
    }
  });

  /** The one sentence a screen reader hears in place of the loose numbers. */
  protected readonly announcement = computed(() => {
    const model = this.price();
    const base = priceAnnouncement(model.sellingPrice, model.compareAtPrice, this.locale());
    const qualifiers = model.qualifiers?.length ? `. ${model.qualifiers.join('. ')}` : '';
    return base + qualifiers;
  });
}
