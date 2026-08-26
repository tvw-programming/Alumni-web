# AppointmentSlotGrid

Pick a day, then a time.

## API

```ts
type AppointmentSlotGridProps = {
  dates: CalendarDate[];
  slots: Record<string, AppointmentSlot[]>; // keyed by date
  selectedDate?: string;
  selectedSlotId?: SlotId;
  conflictMessage?: string;
  onDateChange: (date: string) => void;
  onSlotChange: (slotId: SlotId) => void;
};
```

## React 19

**Selection only.** Booking is the parent's Action.

`useOptimistic` is wrong here: a held slot is not a reservation, and predicting
one predicts a reservation another patient may already have taken. On conflict
the parent passes a new slot list and `conflictMessage` — "this time was just
booked" — and the user picks again from what is actually free.

## Timezones

Every time prints its zone, and the day footer repeats it. A telemedicine slot
at "4:30 PM" with no zone is how patients miss appointments.

## Accessibility

- Radio semantics for a single choice, so arrows move between times.
- The group label announces the count: _"3 available times"_.
- Unavailable slots stay visible, struck through, and say why: _"10:30 AM
  Asia/Kolkata, already booked"_.
- Dates announce _"Sat 8 Aug, 1 available time"_.

## Note

Clear the selected slot when the date changes — slot ids are per-day, and
keeping one across a date change books the wrong appointment.
