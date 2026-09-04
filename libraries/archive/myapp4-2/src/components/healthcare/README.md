# Healthcare Component Library

Domain layer for provider discovery, scheduling, virtual visits, records,
medication and clinical intake. Built **on top of** the base library in
`src/components/` — it composes `AppCard`, `AppButton`, `AppTextInput`,
`AppSheet`, `ListItemRow`, `RatingStars`, `SkeletonLoader`, `StateView` and the
Toast/Sheet/Confirm providers rather than duplicating them.

## Folder structure

```
src/components/healthcare/
├── theme/healthcareTokens.ts     # calm clinical tokens (status.*, range.*, provenance.*)
├── types/domain.ts               # Doctor, Appointment, VitalReading, ConsentItem, …
├── primitives/ClinicalSafety.tsx # ProvenanceLabel · UrgentEscalation · NotAdviceNotice
│
├── DoctorCard/
├── AppointmentSlotGrid/
├── AppointmentCard/
├── SymptomSelector/
├── VitalsCard/
├── MedicationReminderItem/
├── HealthDocuments/              PrescriptionCard + ReportListItem
├── VideoCallControlsBar/
├── ChatBubble/                   ChatBubble + AttachmentCard + SecureMessagingBanner
├── ConsentDialog/                + consentController.ts        (headless)
├── HealthQuestionnaireForm/      + questionnaireEngine.ts      (pure branching/validation)
├── BMICalculatorCard/            + bmiEngine.ts                (pure, unit-testable)
└── EmergencyContactCard/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Health UI** tab renders them
directly, so an example that drifts from its component fails the typecheck.

## The three layers

> UI presentation · structured health data · clinical decision logic.

The UI renders an explicit clinical state supplied by a governed service. It does
not diagnose, interpret abnormal vitals, recommend medication changes, or decide
emergency severity. Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `VitalsCard` | Decide what a reading means. It renders `interpretation` from a rules service; there is **no threshold table in the file**. |
| `SymptomSelector` | Infer urgency. `clinicalPriority` comes from versioned clinical content. |
| `MedicationReminderItem` | Author dosing advice. `safetyNotice` comes from the prescribing system. |
| `ConsentDialog` | Record consent from a view, a scroll, or a "Continue". Only an explicit action counts, and optional items start unticked. |
| `BMICalculatorCard` | Categorise a child, a pregnancy, or an unknown age. It returns the number and says it is not interpretable. |
| `AppointmentCard` | Decide a visit can be joined. `joinEligible` comes from the visit service. |
| `AppointmentSlotGrid` | Book optimistically. Selection is instant; booking re-validates and `conflict` is a first-class state. |
| `EmergencyContactCard` | Imply the app can dispatch help. It says plainly that it cannot. |

## Cross-cutting standards

**Abnormal ≠ urgent.** The palette is deliberately calm. A lab value outside a
reference range is common and usually routine, so `rangeOutside` is amber-ish,
not red. `urgentAccent` is reserved for states a clinician explicitly marked
urgent. `ReportListItem` renders "Out of range" and "Follow up" as two separate,
differently-toned signals.

**Provenance is first-class.** A patient-entered reading, a device sync and a
clinician-reviewed result never look identical — `ProvenanceLabel` is shared by
every surface that shows health data, alongside a stale indicator.

**Escalation is never buried.** `UrgentEscalation` appears the moment an urgent
symptom or answer is selected — at the top of the flow, not after the
questionnaire — and the caller is expected to pause the flow, not just log it.

**Never colour alone.** Appointment status, medication status, call controls,
trends and interpretations all pair an icon with a word. Call-control labels
state the *action* and flip with state ("Mute microphone" ↔ "Unmute microphone").

**Escape answers always exist.** "None", "I'm not sure" and "Prefer not to
answer" are rendered as real options, and answers survive a failed validation.
Progress is hidden entirely when branching makes the total unreliable rather than
shown as a number that will change.

**Privacy.** Phone numbers are masked and never logged. Document URLs are
short-lived signed links, never sent to analytics. `BMICalculatorCard` has a
privacy mode for shared screens.

## Tokens

`design-tokens/healthcare.tokens.json` — light and dark, semantic names only:
`statusUpcoming`/`Ready`/`Completed`/`Canceled`/`RequiresAction`,
`rangeUsual`/`rangeOutside`/`rangeReview`,
`provenancePatient`/`Device`/`Clinician`/`Unknown`, `stale`,
`urgentSurface`/`urgentAccent`, `medDue`/`Taken`/`Missed`/`Skipped`,
`chat*Surface`, `call*`, and the trend colours.

Read them with `useHealthTheme()`. No component in this folder accepts a hex value.

## Usage

```tsx
import { VitalsCard, UrgentEscalation } from '@ui/healthcare';

<VitalsCard
  reading={reading}                 // interpretation supplied by the rules service
  onViewTrend={openTrend}
  onContactCareTeam={startMessage}  // only offered when a clinician flagged it
/>
```

See the running app's **Health UI** tab for all thirteen, or read any
`*.usage.tsx` for the same examples in source form.

---

**Before release**, these components need clinical, legal, privacy and
accessibility review, plus versioned clinical content for symptom taxonomy,
interpretation rules and consent wording. The library makes the safe path the
easy path; it does not replace that review.
