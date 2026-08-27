# MedicationReminderItem

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Medisafe** | Design | Time-first row: scheduled hour and status on the left, pill image, then name and instructions — a schedule is read down the time column. |
| **Medisafe** | Feature | Pill photograph as an identification aid, which matters for patients on many similar-looking tablets. |
| **MyTherapy** | Design | Taken doses recede into a filled surface rather than disappearing, so the day's record stays visible. |
| **MyTherapy** | Feature | Adherence streak, shown as encouragement and only once it means something. |
| **Medisafe** | Feature | Snooze as a first-class action beside Taken and Skip — the real alternative to "not now" is not "skip". |
| **CareZone** | Feature | Undo on a settled dose; tapping the wrong row is the commonest error in these lists. |
| **NHS App** | Feature | Cautions and interaction warnings always visible, never behind a tooltip. |
| **1mg / PharmEasy** | Design | Strength and form appended to the name ("Metformin 500 mg tablet") so a dose is unambiguous. |

## The tone decision

**A missed dose is reported, not scolded.** Adherence apps that shame produce
patients who mark doses taken to clear the badge — a worse record than an honest
one. So:

- `missed` gets neutral styling, not red, and keeps the Taken action available;
- the streak appears only at three days or more (a "1-day streak" is noise, and
  a zeroed streak after a lapse reads as a reprimand);
- `due` is the only state that draws emphasis, because it is the only one asking
  for something now.

Cautions are safety information and therefore always rendered — never behind a
tooltip, a "more" toggle, or a hover.

## Accessibility

- The row is one labelled `article`: *"Metformin 500 mg tablet, 8:00 am, Due now,
  Do not take on an empty stomach"* — cautions included, because a warning a
  screen-reader user never hears is not a warning.
- Every action names its medicine (`Mark Metformin 500 mg tablet as taken`); in
  a list of eight doses, eight buttons labelled "Taken" are useless.
- Pill images are `alt=""` — the name sits beside them and a duplicate
  announcement is noise.

## Usage

```html
<app-medication-reminder-item
  [dose]="dose"
  [busy]="schedule.pending(dose.id)()"
  (markTaken)="schedule.record($event, 'taken')"
  (snooze)="schedule.snooze($event)"
  (skip)="schedule.record($event, 'skipped')"
  (undo)="schedule.undo($event)"
/>
```
