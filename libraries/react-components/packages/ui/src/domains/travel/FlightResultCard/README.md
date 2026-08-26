# FlightResultCard

## API

```ts
type FlightResultCardProps = {
  offer: FlightOffer; // legs[], price, cabinBag, checkedBag, refundable, changeable, seatsLeft?
  onSelect: () => void;
};
```

## Baggage is on the card, in words

"From ₹4,299" next to a fare that carries no cabin bag is the most
complained-about pattern in flight search — a deliberate omission dressed as a
layout decision. `cabinBag` and `checkedBag` are **required strings**, so a card
cannot render without them.

## `+1` and timezones

A 23:55 → 06:10 flight is not a six-hour flight. The arrival carries a red `+1`
when it lands on a later day, both ends print their zone, and the leg label
spells it out for a screen reader.

## Accessibility

Each leg is one phrase: _"IndiGo 6E 512, BLR 6:25 PM Asia/Kolkata, to BOM
9:05 PM Asia/Kolkata, 2h 40m, 1 stop via HYD."_ The Select button repeats price
and baggage, so twenty results do not produce twenty buttons called "Select".
