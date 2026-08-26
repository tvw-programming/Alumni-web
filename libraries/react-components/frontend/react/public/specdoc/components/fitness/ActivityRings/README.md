# ActivityRings

## API

```ts
type ActivityRingsProps = {
  goals: ActivityGoal[]; // label, current, goal, unit, colour
  syncedFrom?: string;
  updatedAt?: string;
  emptyMessage?: string;
};
```

## The text is the content

The rings are `aria-hidden` and every goal is also a row: _"Move: 420 of 600
kcal · 70%"_, _"Exercise: 32 of 30 min · goal complete"_. Rings are the least
accessible chart there is — nested arcs distinguished by colour — so the text is
the real content, not a fallback.

## Health data is authoritative

Never optimistic. This renders what was synced. Source and sync time are shown
because a ring that has not updated since this morning is one people misread as
today's total.

## Empty is a sentence

"No data yet" rather than three empty rings, which look like zero progress
instead of no information.

**Never infer a diagnosis from wellness data.**
