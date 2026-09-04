# AppointmentCard

## API

```ts
type AppointmentCardProps = {
  appointment: Appointment; // clinician, start, timezone, mode, status, joinableFromMinutes?
  now?: Date; // injected, so the join window is testable
  onJoin?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
};
```

## The join window

The Join button is time-gated, not always enabled. A video room opened an hour
early is a patient sitting alone in it wondering whether they have the wrong
link. Before the window the button says when joining opens.

## Accessibility

One label: _"Dr Ananya Rao, Internal medicine, 3:30 PM Asia/Kolkata, tomorrow
(7 Aug 2026, 15:30), video consultation, Confirmed."_ Both the clock time with
its zone **and** the relative phrasing — a patient needs to know it is tomorrow,
and exactly when.
