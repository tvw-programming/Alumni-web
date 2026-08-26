# WorkoutCard

## API

```ts
type WorkoutCardProps = {
  workout: Workout; // title, discipline, durationLabel, level, equipment[], exerciseCount, state, progressPercent?
  onStart: () => void;
  onToggleComplete?: (completed: boolean) => Promise<void>;
};
```

## Equipment is on the card

"Requires: dumbbells, bench" decided at the gym door is useful; discovered at
exercise four is a workout abandoned. `equipment` is required, with "Bodyweight
only" as the honest empty value.

## A rest day is a state, not an absence

A plan that shows nothing on Wednesday looks broken. "Rest day · Recovery is part
of the plan." is the instruction.

## React 19

`useOptimistic` for completion and scheduling — the user's own log, reversible,
and it rolls back if the write fails to sync. `useActionState` for logging the
actual sets and reps, where the server records data a coach may read.
