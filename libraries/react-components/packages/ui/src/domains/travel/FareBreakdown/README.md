# FareBreakdown

## API

```ts
type FareBreakdownProps = {
  lines: PriceLine[];
  total: Money;
  previousTotal?: Money; // set when the server repriced
  cancellationPolicy?: string;
  footnote?: string;
};
```

## Reuse

Composes `ecommerce/PriceBreakdown`. A fare is a money list, and a second
implementation would drift on the accessibility details alone — negative amounts,
hidden labels, tabular figures.

## What travel adds: repricing

Airlines and hotels change the price between search and payment. The user must
see the old number beside the new one:

> "The price changed from ₹14,458.00 to ₹14,980.00 while you were booking."

Silently charging a different total than the one they chose is the complaint that
becomes a chargeback.

## Cancellation before payment

Stated here, with the deadline and the fee — not on the confirmation page.

## React 19

`useActionState` for confirmation and revalidation. `useOptimistic` only for
local selections (room, fare, add-on) _before_ server validation — never for a
total.
