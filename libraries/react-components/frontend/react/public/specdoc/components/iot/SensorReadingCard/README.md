# SensorReadingCard

## API

```ts
type SensorReadingCardProps = {
  reading: SensorReading; // label, value, unit, measuredAt, staleAfterMinutes?, batteryPercent?, room?
  now?: Date; // injected, so staleness is testable
};
```

## Staleness is the whole point

A sensor that stopped reporting three hours ago still has a last value, and
showing it as though it were current is the most common way an IoT dashboard
misleads. Past `staleAfterMinutes` the number dims and the card says **"Last seen
3 hours ago"** — and the label says _"last known value 31.4 °C, not reporting"_.

## Battery only when low

A percentage on every card is noise. "Battery 12%" on the one that needs a cell
is a prompt.
