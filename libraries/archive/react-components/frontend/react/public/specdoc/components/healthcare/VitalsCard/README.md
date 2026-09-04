# VitalsCard

A single vital reading.

## API

```ts
type VitalsCardProps = {
  vital: {
    type: 'bloodPressure' | 'glucose' | 'heartRate' | 'temperature' | 'spo2';
    values: Record<string, number>;
    unit: string;
    measuredAt: string;
    source?: string;
    trend?: 'up' | 'down' | 'stable' | 'unknown';
    interpretation?: 'usual' | 'outsideRange' | 'reviewRequired';
  };
  onPress?: () => void;
};
```

## React 19

**Never `useOptimistic`.** A reading is a measurement; predicting one shows a
number that was never taken. Manual entry is an Action, and "Saved" appears only
after the mutation succeeds.

## Interpretation, never diagnosis

| State          | Wording                     |
| -------------- | --------------------------- |
| usual          | "In your usual range"       |
| outsideRange   | "Outside your usual range"  |
| reviewRequired | "Share with your clinician" |

"High" is a clinical judgement. A component that renders one is practising
medicine. The wording stays descriptive, and `reviewRequired` says who should
look rather than what is wrong.

## Source and time

Both are always shown. A reading from a wrist device an hour ago and a manual
entry from yesterday are different evidence, and a chart that merges them
silently is misleading.

## Accessibility

One label per card: _"Blood pressure, 128/82 mmHg, Outside your usual range,
trending up, measured 3 hours ago (6 Aug 2026, 07:20), from Omron M7."_ The
visual parts are `aria-hidden` so it is announced once.
