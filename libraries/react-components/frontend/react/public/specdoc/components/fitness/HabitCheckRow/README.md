# HabitCheckRow

## API

```ts
type HabitCheckRowProps = {
  habit: Habit; // name, lastSevenDays[], streakDays, doneToday, cadenceLabel?
  onToggleToday: (done: boolean) => Promise<void>;
};
```

## The seven-day strip is decorative

`aria-hidden`, and summarised in the row label as _"5 of the last 7 days"_. Seven
coloured squares are meaningless to a screen reader, and the count is what a
person reads off them anyway.

## No scolding

A broken streak simply returns to zero, with no commentary. Habit trackers that
scold do not get opened again.

## React 19

`useOptimistic` — the tick is instant and rolls back if the write fails.
