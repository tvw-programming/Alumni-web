# ScheduleTimerRow

## API

```ts
type ScheduleTimerRowProps = {
  timer: ScheduleTimer; // label, time, days[], action, enabled, timezone?
  onToggle: (enabled: boolean) => Promise<void>;
  onPress?: () => void;
};
```

## Days are words

"Weekdays", "Every day", "Mon, Wed, Fri" — never a row of seven single letters
with some bolded. That pattern is unreadable to a screen reader and ambiguous to
everyone: two of the letters are "T" and two are "S".

## The timezone is printed

A heating schedule that silently shifts with travel is a schedule nobody trusts.

## React 19

`useOptimistic` for the enable switch — a stored flag, no device acknowledgement
to wait for. The switch stops click propagation so toggling never also opens the
editor.
