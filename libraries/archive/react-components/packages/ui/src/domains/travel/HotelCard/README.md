# HotelCard

## API

```ts
type HotelCardProps = {
  hotel: Hotel; // nightlyPrice AND totalPrice, nights, freeCancellationUntil?, roomsLeft?
  onSelect: () => void;
};
```

## Both prices, always

Per-night is what people compare on; total is what they pay. Showing only the
first is how a ₹4,000 room becomes ₹19,000 at checkout. The total reads _"₹19,320
total for 4 nights, taxes included"_ — no second interpretation available.

Both are required fields on the type, so a card cannot render half the truth.

## The cancellation deadline is a date

"Free cancellation until 10 Sep", not the bare phrase — which is worthless at the
moment it matters.

## Accessibility

One label carrying name, rating, area, both prices and the cancellation terms, so
a screen-reader user comparing hotels hears the same facts a sighted user scans.
