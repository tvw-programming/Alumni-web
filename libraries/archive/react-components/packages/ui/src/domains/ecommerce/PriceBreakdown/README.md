# PriceBreakdown

Read-only money list, shared by cart, checkout, booking and fare screens.

## API

```ts
type PriceBreakdownProps = {
  lines: PriceLine[]; // { label, amount, note?, emphasis? }
  total: Money;
  totalLabel?: string;
  footnote?: string;
  dense?: boolean;
};
```

## The rule

Deliberately dumb: it takes computed lines and prints them. The moment a
breakdown component adds numbers up, two places know how a total is made — and
they drift.

**Every mandatory fee is a line.** A "service fee" that appears only on the
payment screen is drip pricing; this component gives it nowhere to hide. `note`
is for context ("Free over ₹1,500"), never for hiding a charge.

## Accessibility

- Negative amounts announce as _"Monsoon offer, minus 200 rupees"_, not
  "hyphen 200".
- Notes are inside the hidden row label, so the info icon is decorative rather
  than a tooltip a keyboard user has to hunt for.
- `tabular-nums` keeps the column aligned as values change.
