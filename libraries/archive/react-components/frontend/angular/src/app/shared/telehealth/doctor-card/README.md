# DoctorCard

## Benchmark references

Telehealth and booking products, with what was taken and whether it is a
**design** or **feature** pattern. These are reusable specifications, not
replicas of proprietary interfaces.

| App | Kind | What we took |
|---|---|---|
| **Practo** | Design | Information order in a results row: photo, name, specialty, qualifications, experience, fee — a fixed scan path repeated down the list. |
| **Practo** | Feature | Consultation fee shown on the card, so cost is part of the choice rather than a checkout surprise. |
| **Zocdoc** | Design | Next-available time given its own column at the end of the row, visually separated from the clinician's credentials. |
| **Zocdoc** | Feature | Availability drives the primary action — "Book" is disabled when no slots are published rather than leading to an empty calendar. |
| **Doctolib** | Design | Relative day wording ("Today, 4:30 pm") instead of a raw date, which is what makes a long list scannable. |
| **Doctolib** | Feature | Verified-practitioner marker distinct from rating — credentials and popularity are different claims. |
| **Apollo 24\|7 / 1mg** | Design | Consultation-mode chips (video / audio / chat / in-person) as compact pills under the clinician's details. |
| **Apollo 24\|7** | Feature | Languages spoken, which is a genuine filter criterion in multilingual markets. |
| **Teladoc / Amwell** | Feature | Mode availability varies per clinician, so the card advertises only the modes that clinician actually offers. |

## The judgement encoded here

**Next availability outranks rating.** A patient choosing a clinician is
choosing a time first and a person second. Every strong booking product gives
"Today, 4:30 pm" more prominence than a star average, and this card follows —
availability sits in the action column, styled with emphasis when it is today.

## Accessibility

- The card is **not one link**. The name is the link, `Book` is a separate
  control, each with its own accessible name (`Book appointment with Dr Rao`).
- Consultation-mode icons always carry visible text; a row of bare glyphs is a
  puzzle, not a mode list.
- The avatar has `alt=""` because the name beside it is the label — a duplicate
  announcement is noise. Missing photos render initials rather than a generic
  silhouette.
- "Today" emphasis is weight plus wording, never colour alone.

## Usage

```html
<app-doctor-card
  [doctor]="doctor"
  layout="list"
  [busy]="booking.pending()"
  (book)="booking.start($event)"
  (viewProfile)="router.navigate(['/doctors', $event.id])"
/>
```
