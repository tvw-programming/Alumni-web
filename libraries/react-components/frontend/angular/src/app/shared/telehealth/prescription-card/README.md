# PrescriptionCard

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **GoodRx** | Design | Prescription summary: prescriber and date at the head, medicines as a compact table, actions at the foot. |
| **MyChart (Epic)** | Feature | Validity stated as a date *and* a countdown, so a lapsed script is obvious before a pharmacy visit. |
| **MyChart** | Feature | Expired prescriptions remain readable — they are still a record of what was prescribed. |
| **1mg** | Feature | Refill count surfaced on the card, and the refill action withheld when none remain. |
| **PharmEasy** | Design | Strength shown beside the medicine name, dosage right-aligned in its own column so a list reads as a table. |
| **NHS App** | Feature | "Awaiting clinician approval" as a distinct state — a prescription that exists but cannot yet be used. |
| **Practo** | Feature | Downloadable document, with the action absent rather than disabled when no document exists. |

## The decision that matters

**Validity is stated, not implied.** A card listing medicines with no expiry
invites someone to take a lapsed script to a pharmacy. So `validUntil` renders
as a countdown near the end ("Expires in 4 days") rather than a bare date the
patient must compare against today, and the two-week window is where a refill
request stops being premature.

**Every item is listed.** A "+3 more" toggle on a prescription hides exactly
what the patient opened it to read.

`now` is an input, so validity is deterministic in tests and stories.

## Accessibility

- The card is one `role="group"` whose label names prescriber, date, status,
  every medicine, and the validity — the visual fragments are `aria-hidden`.
- Actions name the prescription ("Request a refill of the prescription from
  Dr Ananya Rao"), since a list of cards otherwise yields identical buttons.
- Status is a bordered word, never a colour swatch.

## Usage

```html
<app-prescription-card
  [prescription]="prescription"
  [now]="clock.now()"
  (download)="documents.download($event)"
  (requestRefill)="pharmacy.requestRefill($event)"
/>
```

Never put PHI in a document URL — pass an id and let the server resolve it.
