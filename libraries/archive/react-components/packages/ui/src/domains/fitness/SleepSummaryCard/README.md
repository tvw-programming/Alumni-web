# SleepSummaryCard

## API

```ts
type SleepSummaryCardProps = {
  bedtime: string;
  wakeTime: string;
  totalMinutes: number;
  stages: SleepStage[]; // label, minutes, colour
  goalMinutes?: number;
  source?: string;
  updatedAt?: string;
};
```

## Stages are labelled with minutes

"Deep 1h 12m", not only a segment of a stacked bar. Four colours in one bar is
unreadable to a screen reader and imprecise for everyone.

## It reports; it does not interpret

No sleep score, no "poor night", no advice. Wellness data is not a diagnosis, and
a number that implies one worries people without helping them.

Source and time are shown because a night that failed to sync is otherwise
indistinguishable from a night with little sleep.
