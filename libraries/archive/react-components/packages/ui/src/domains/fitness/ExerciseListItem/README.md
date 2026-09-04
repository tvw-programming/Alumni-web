# ExerciseListItem

## API

```ts
type ExerciseListItemProps = {
  exercise: Exercise; // name, sets[], restSeconds?, instructions (required), completed
  onToggle: (completed: boolean) => Promise<void>;
  onShowInstructions?: () => void;
};
```

## `instructions` is required

The demo is usually a GIF or a video, and neither carries information to a screen
reader — or to anyone with data saving on. A form cue that exists only as
animation is a cue half the users never receive.

## The set summary is written out

"3 sets · 10 × 20 kg · 10 × 20 kg · 8 × 22.5 kg · 90s rest", not a row of boxes.
It survives being read aloud, which a grid of numbers does not.

## React 19

`useOptimistic` for ticking an exercise — instant, reversible, and rolled back if
the sync fails.
