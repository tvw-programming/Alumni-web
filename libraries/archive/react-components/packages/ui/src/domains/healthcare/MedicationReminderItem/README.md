# MedicationReminderItem

One scheduled dose.

## API

```ts
type MedicationReminderItemProps = {
  dose: MedicationDose; // medication, strength, instruction, scheduledAt, state, takenAt?
  onMarkTaken: () => Promise<void>;
  onSkip?: (reason: string) => Promise<void>;
};
```

## React 19

`useActionState`, **not** `useOptimistic`. An adherence record is clinical
evidence — a prescriber may change a dose based on it. A tick that appears
before the server has the record, and silently vanishes on a failed request, is
a record that lies about what a patient took.

## Details that matter

- The **instruction** ("with or just after food") is on the row, not behind a
  tap. It is only useful at the moment of taking.
- **Skipping requires a reason.** "Skipped" with no reason is useless to a
  prescriber reviewing adherence.

## State matrix

| State    | Renders                                          |
| -------- | ------------------------------------------------ |
| due      | pill icon, Skip + Mark taken                     |
| upcoming | 70% opacity                                      |
| taken    | green check, "Taken at 6:32 PM", actions removed |
| missed   | red "Missed" chip, actions still available       |
| skipped  | "Skipped" chip                                   |
| saving   | "Saving…", button disabled                       |
| failed   | `role="alert"` message, state unchanged          |
