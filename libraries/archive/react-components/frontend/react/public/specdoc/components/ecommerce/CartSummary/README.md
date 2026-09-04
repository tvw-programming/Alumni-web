# CartSummary

## API

```ts
type CartSummaryProps = {
  totals: CartTotals; // subtotal, discounts, shipping, tax, serviceFee, total
  recalculating?: boolean;
  changedNotice?: string;
  itemCount?: number;
  onCheckout: () => Promise<void>;
};
```

## The rule

**This component computes nothing.** Every figure arrives calculated. Tax and
shipping depend on address, weight, promotions and jurisdiction; a client that
approximates them eventually shows a number the payment does not match.

## React 19

`useActionState` for checkout. No `useOptimistic` anywhere — "your cart changed"
is a real outcome and the user must see the new totals before the charge.

## State matrix

| State            | Renders                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| idle             | rows + total                                                               |
| recalculating    | 60% opacity, `aria-busy`, spinner in place of the total, checkout disabled |
| totals changed   | info alert above the rows                                                  |
| checkout pending | "Starting checkout…", disabled                                             |
| checkout failed  | message in a polite live region                                            |

## Accessibility

Each money row is rendered twice: the visible `-₹200.00`, and a visually hidden
_"Discounts, minus 200 rupees"_. Several screen readers announce a leading
hyphen as the word "hyphen", which turns a discount into nonsense. The visible
parts carry `aria-hidden`, so nothing is read twice.
