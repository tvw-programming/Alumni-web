# AppointmentSlotGrid

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Zocdoc** | Design | Day columns side by side with times stacked beneath, so a week is comparable at a glance instead of one day at a time. |
| **Zocdoc** | Feature | Taken times shown struck through rather than removed — a column of crossed-out times says "fully booked", an empty column says nothing. |
| **Doctolib** | Design | Sticky day headers with a per-day count, and horizontal scroll-snap so a swipe lands on a whole day. |
| **Doctolib** | Feature | Collapse long clinic days behind "Show more"; a 40-slot column buries every following day below the fold. |
| **Calendly** | Design | Selected time carries border weight *and* a filled surface, not colour alone. |
| **Calendly** | Feature | Keyboard traversal between times as a single group, not 40 separate tab stops. |
| **Practo** | Feature | Scarcity marker ("Few left") distinct from availability, so urgency is honest rather than universal. |
| **Apollo 24\|7** | Feature | Distinguishes "no slots published" from "all slots taken" — different problems, different next actions. |

## The accessibility decision that shapes the markup

**This is a `radiogroup`, not a grid of buttons.** Picking a time is choosing
one of a set, and the radio pattern gives that for free:

- arrow keys move between times; **one** tab stop for the whole picker rather
  than forty;
- `aria-checked` communicates selection independently of styling;
- the group name is announced once, and each option's own label carries the day
  (`"Tomorrow, 27 Aug 10:00 am"`) — a radio labelled only "10:00 am" is
  ambiguous across seven columns.

Disabled slots keep their reason in the accessible name: *"Fri, 28 Aug 12:00 pm,
Clinic closed"*.

## Three states, not two

`loading` → skeleton that preserves column geometry ·
`no slots published` → offer later dates ·
`slots exist but none bookable` → a different message, announced via
`role="status"`. Collapsing the last two into "no results" loses the distinction
a patient needs to decide what to do next.

## Usage

```html
<app-appointment-slot-grid
  [days]="slots.days()"
  [selectedSlotId]="booking.slotId()"
  [loading]="slots.loading()"
  (selectSlot)="booking.chooseSlot($event)"
  (requestMoreDays)="slots.loadNextWeek()"
/>
```
