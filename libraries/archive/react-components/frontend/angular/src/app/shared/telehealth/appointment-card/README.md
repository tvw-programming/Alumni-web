# AppointmentCard

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Teladoc** | Design | Status-led card: provider, status chip, time, visit type in a fixed order down the left, actions in a column on the right. |
| **Teladoc** | Feature | Join as the primary action for a telehealth visit, promoted above reschedule and cancel. |
| **Amwell** | Feature | **Join is time-gated** — the room opens shortly before the start, and outside that window the card says when. |
| **Amwell** | Design | Visit type stated in words ("Video visit" / "In clinic") rather than only an icon. |
| **MyChart (Epic)** | Feature | Cancellation policy honoured in the UI: inside the clinic's window the action is withheld, not shown and then rejected. |
| **Zocdoc** | Design | Completed and cancelled appointments visually recede in a mixed list so upcoming ones read first. |
| **Practo** | Feature | Reschedule kept distinct from cancel — different intents with different consequences. |

## The bug this fixes

The source scaffold rendered Join for *any* telehealth appointment that was not
cancelled:

```html
<button *ngIf="appointment.location === 'telehealth' && appointment.status !== 'cancelled'">Join</button>
```

That shows a Join button for an appointment three weeks away. A patient clicks
it, lands in an empty room, and calls support. Here:

- `joinable` from the server wins when present — only the backend knows whether
  the clinician has actually started;
- otherwise a **15-minute window** before the start opens the button;
- outside it, the card *says why*: "You can join 15 minutes before the start."

`now` is an input rather than a call to `new Date()` inside the component, so
the window is deterministic in tests and stories.

## Status is never rendered raw

`noShow` printed verbatim in a chip reads as a system error. Statuses map to
patient-facing words — `noShow` → "Missed", `requested` → "Awaiting
confirmation" — and the chip carries an outline plus text, never colour alone.

## Usage

```html
<app-appointment-card
  [appointment]="appointment"
  [now]="clock.now()"
  (join)="call.join($event)"
  (cancelAppointment)="booking.confirmCancel($event)"
  (reschedule)="booking.reschedule($event)"
/>
```

Every sample in `appointment-card.sample.json` pairs the appointment with the
`now` it should be rendered against — a time-gated component with no reference
clock in its fixtures is untestable.
