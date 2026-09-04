# WorkoutPlanTimeline

## API

```ts
type WorkoutPlanTimelineProps = {
  planName: string;
  weekLabel: string;
  days: PlanDay[]; // dayLabel, title, kind: 'workout' | 'rest', completed, isToday?, locked?
  onOpenDay: (id: string) => void;
};
```

## Rest days are not in the denominator

Progress counts **completed of scheduled workouts**. Including rest days makes a
plan look unfinished when the user did everything asked of them — exactly
backwards.

## Locked days are visible

Marked "Locked" rather than hidden. Seeing what is coming is most of why people
follow a plan.

## Accessibility

Today's row carries `aria-current="date"`; each row announces its state,
including _"locked until earlier days are done"_.
