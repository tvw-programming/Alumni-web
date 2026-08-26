# WaterIntakeTracker

## API

```ts
type WaterIntakeTrackerProps = {
  currentMl: number;
  goalMl: number;
  presets: number[];
  onChange: (nextMl: number) => Promise<void>;
};
```

## Presets in real container sizes

"Glass 250 ml", "Bottle 500 ml". Nobody knows what 250 ml looks like; everybody
knows what a glass is.

## Over-goal is celebrated, not clamped

The bar caps at 100% but the **number does not**: "2,750 ml of 2,500 ml · Goal
reached · 250 ml over". A tracker that sticks at 100% hides how much was actually
drunk.

## React 19

`useOptimistic` — the user's own log, trivially reversible, and tapping "glass"
four times should not feel like four round trips.
