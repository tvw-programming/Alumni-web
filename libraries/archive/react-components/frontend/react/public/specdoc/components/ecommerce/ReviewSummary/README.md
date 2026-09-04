# ReviewSummary

## API

```ts
type ReviewSummaryProps = {
  average: number;
  total: number;
  distribution: Partial<Record<1 | 2 | 3 | 4 | 5, number>>;
  verifiedCount?: number;
  onSelectRating?: (stars: number) => void;
};
```

## Why the histogram, not just the average

4.0 from a thousand 4-star reviews and 4.0 from an even split of 1s and 5s are
different products. Only the distribution tells them apart.

## Accessibility

- The numeric average, the star glyphs and the count are `aria-hidden`, replaced
  by one hidden sentence: _"Rated 4.4 out of 5, from 1,284 reviews, 1,102 from
  verified purchases."_ Otherwise the same fact is announced three times.
- When filtering is enabled each bar is a real `<button>` with a focus ring —
  a clickable `div` here is unreachable by keyboard.
- Each bar announces _"5 star, 812 reviews, 63 percent"_.
