# Telehealth component library

Reusable Angular 22 components for clinician discovery, booking, consent and
consultation — built to the same conventions as `shared/commerce`.

## Corrections to the source blueprint

The specification these were built from contains patterns that **do not compile
on Angular 22**. They are corrected throughout, and the reasons are in
`_core/README.md`. The load-bearing one:

```ts
// Blueprint — removed from Angular before v18, and silently breaks reactivity
add(a: Appointment) { this._appointments.mutate(arr => arr.push(a)); }

// Angular 22
add(a: Appointment) { this._appointments.update(cur => [...cur, a]); }
```

`mutate()` did more than not exist: mutating an array in place leaves the
signal's reference identical, so nothing downstream recomputes and the UI
silently fails to update. Also corrected: `@Input()` → `input.required()`,
`standalone: true` (now the default), constructor injection → `inject()`,
`.subscribe()` in services, `*ngFor`/`trackBy` → `@for`/`track`, and
`mat-stroked-button` → `matButton="outlined"`.

Verified against this codebase: zero occurrences of `.mutate(`, and
`input.required` / `inject()` are the existing idioms.

## Benchmark matrix

| Component | Design references | Feature references |
|---|---|---|
| **DoctorCard** | Practo (results-row scan path) · Zocdoc (availability in its own column) · Doctolib (relative day wording) · Apollo 24\|7 (mode chips) | Practo (fee on card) · Zocdoc (availability drives the CTA) · Doctolib (verified marker separate from rating) · Apollo 24\|7 (languages) · Teladoc/Amwell (per-clinician modes) |
| **AppointmentSlotGrid** | Zocdoc (day columns) · Doctolib (sticky headers, scroll-snap) · Calendly (selection weight, not colour) | Zocdoc (taken times struck through, not removed) · Calendly (single tab stop) · Practo (scarcity distinct from availability) · Apollo 24\|7 ("none published" vs "all taken") |
| **ConsentDialog** | Teladoc (pre-consult gate) · Amwell (per-clause plain-language body) · Doctolib (full document as secondary link) | Teladoc (required vs optional separated) · Amwell (recording as its own decision) · MyChart (versioned acknowledgement) · Babylon (remote-exam limitation disclosure) |
| **AppointmentCard** | Teladoc (status-led layout) · Amwell (visit type in words) · Zocdoc (past appointments recede) | Amwell (join gated to a 15-minute window) · MyChart (cancellation policy honoured, not rejected after the fact) · Practo (reschedule distinct from cancel) |
| **SymptomSelector** | Ada (search-then-confirm, chips) · Babylon (running list inside the field) · Practo (body-system grouping in the model) | Ada (lay-synonym matching) · WebMD (match reason shown) · K Health (red flags in the catalogue) · Babylon (capped selection) |
| **ChatBubble** | WhatsApp (side-anchored bubbles, ticks) · iMessage (author grouping) · MyChart (system notices centred) | Signal (failed-send recovery in place) · Halodoc (attachment scan gating) · Doctolib (redaction tombstone) |
| **VideoCallControls** | Zoom (cluster with end-call separated) · Google Meet (filled "off" states) · Doxy.me (duration as text) | Zoom (end-for-all vs leave) · Amwell (connection quality announced) · Teams (screen share as a pressed toggle) |
| **VitalsCard** | Apple Health (metric tile) · Fitbit (inline sparkline) · MyChart (reference range shown) | Apple Health (relative recency) · MyChart (abnormality flagged by the source system) · Practo (reading provenance) |
| **MedicationReminderItem** | Medisafe (time-first row, pill image) · MyTherapy (taken doses recede) · 1mg (strength appended to name) | Medisafe (snooze as a first-class action) · MyTherapy (adherence streak) · CareZone (undo) · NHS App (cautions always visible) |
| **PrescriptionCard** | GoodRx (summary layout) · PharmEasy (dosage column) | MyChart (validity as a countdown; expired stays readable) · 1mg (refill count) · NHS App (awaiting-approval state) |
| **ReportListItem** | LabCorp (list row) · NHS App (processing state keeps geometry) · Practo (clamped titles) | MyChart (clinician release model; amended results) · LabCorp (abnormality set by the lab) · Apollo 24\|7 (download size before the tap) |
| **HealthQuestionnaireForm** | Ada (progressive disclosure) · Babylon (sticky progress) · Typeform (one idea per question) | K Health (red-flag escalation over scoring) · MyChart (versioned questionnaire) · NHS 111 (error summary with links) |

## Build status

| Piece | State |
|---|---|
| `_core` types + `AppointmentStore` | Complete |
| `DoctorCard` | Complete — component, samples, usage, README |
| `AppointmentSlotGrid` | Complete |
| `ConsentDialog` | Complete |
| `AppointmentCard` | Complete |
| `SymptomSelector` | Complete |
| `VitalsCard` | Complete |
| `MedicationReminderItem` | Complete |
| `PrescriptionCard` | Complete |
| `ReportListItem` | Complete |
| `ChatBubble` | Complete |
| `VideoCallControls` | Complete |
| `HealthQuestionnaireForm` | Complete |

## PHI handling

- Every store exposes `clear()`, called at sign-out. Appointments and chat
  bodies are PHI; a store that outlives a session hands the next user the
  previous one's clinical data.
- Nothing writes to `localStorage`.
- `ChatMessage.body` and `Appointment.reasonForVisit` must never reach a logger
  or an analytics payload.
- `ConsentDialog` returns decisions; the **caller** persists them server-side,
  so consent is never recorded by a client that then fails to reach the server.
