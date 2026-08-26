# RestTimerCircle

The rest countdown between sets.

## API

```ts
type RestTimerCircleProps = {
  totalSeconds: number;
  remainingSeconds: number;
  running: boolean;
  nextExerciseName?: string;
  onAddTime: (seconds: number) => void;
  onSkip: () => void;
  onToggleRun: () => void;
};
```

## The live region is deliberately sparse

Announcing every tick makes a screen reader unusable for the length of the rest.
This announces at the halfway mark, in the last ten seconds, and at zero — the
same information, without the noise.

## "Next: Dumbbell row"

A rest with no visible purpose is a rest people cut short. Skip is labelled with
it too: _"Skip rest and start Dumbbell row."_

## The countdown is not React state

It belongs to a timer service that keeps running with the screen off. A component
cannot do that, and a timer that stops when the phone locks is worse than none.
