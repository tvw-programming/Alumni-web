# TripSummaryCard

The completed trip: fare, rating and tip.

## API

```ts
type TripSummaryCardProps = {
  trip: TripSummary; // route, times, distance, fareLines, total, driverName, ratingGiven?, tipGiven?
  tipOptions: Money[];
  onRate: (rating: number) => Promise<void>;
  onTip: (amount: Money) => Promise<void>;
};
```

## The fare is itemised

Uses `ecommerce/PriceBreakdown`, so a surge or a toll appears as **a line** —
"Peak-hour surge (1.3×)", "Airport toll" — rather than as an unexplained
difference from the quote. A rider who cannot see why a trip cost more is a rider
who disputes it.

## React 19

| Thing  | Hook             | Why                                       |
| ------ | ---------------- | ----------------------------------------- |
| Rating | `useOptimistic`  | the rider's own gesture, reversible       |
| Tip    | `useActionState` | it moves money, so the server confirms it |
| Fare   | neither          | settled money, never predicted            |
