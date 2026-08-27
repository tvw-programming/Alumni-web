# PriceTag

## Benchmark references

Taken from the benchmark brief; each row names the app, what was borrowed, and
whether it is a **design** or a **feature** pattern.

| App | Kind | What we took |
|---|---|---|
| **Amazon** | Design | Price hierarchy — current price largest and darkest, MRP smaller with strikethrough, discount as a compact coloured label. Supporting lines (EMI, coupon, delivery savings) sit below and never compete with the payable number. |
| **Amazon** | Feature | Member/Prime pricing differentiated without hiding the base price → `qualifiers`. |
| **Flipkart** | Design | Compact percentage-off label adjacent to the price rather than on a separate row, so the whole block scans as one unit. |
| **Flipkart** | Feature | Multiple stacked promotions kept legible → explicit `discount.applied` so automatic and conditional discounts render differently. |
| **Myntra** | Design | Strong prominence for sale price and percentage in fashion listing cards → the `lg` size and the weight step between selling and compare-at. |
| **Myntra** | Feature | Promotional labels treated as compact chips → `.price-tag__qualifier`. |

## Accessibility

The brief's requirement is met literally: a screen reader hears
*"Sale price ₹1,499, original price ₹2,499, 40 percent off"* as one sentence,
because the group carries an `aria-label` and the visual parts are
`aria-hidden`. Without that, the three numbers are read with no relationship
between them.

Discount is never communicated by colour alone — the label always carries text.

## Usage

```html
<app-price-tag [price]="sale" size="lg" />
<app-price-tag [price]="grocery" size="sm" layout="stacked" />
<app-price-tag [price]="listing" [showDiscount]="false" />
```

See `price-tag.usage.ts` for a runnable gallery of every case in
`price-tag.sample.json`.

## Notes

- Percentages are floored in `_core/money.ts` and never computed per surface.
  Rounding 49.6% up to "50% off" contradicts the checkout total.
- An explicit `discount` from the pricing service always wins over one derived
  from the two prices — the service knows about stacked promotions this
  component cannot see.
- `Money` is minor units plus a currency, so no price is ever a float.
