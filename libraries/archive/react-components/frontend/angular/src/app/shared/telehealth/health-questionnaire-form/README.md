# HealthQuestionnaireForm

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Ada Health** | Design | Progressive disclosure — follow-up questions appear only when the preceding answer opens them, so the form stays as short as the patient's situation allows. |
| **Ada Health** | Feature | Plain-language question wording with a help line under it, rather than clinical phrasing. |
| **K Health** | Feature | **Red-flag escalation over scoring** — certain answers raise an event immediately instead of contributing to a total revealed at the end. |
| **Babylon Health** | Design | Sections with a sticky progress indicator, so a long intake shows how much is left. |
| **Typeform** | Design | One idea per question with generous spacing and a narrow measure — questions are read, not scanned. |
| **MyChart (Epic)** | Feature | Versioned questionnaire (`version`), so an answer set can be interpreted against the form that produced it. |
| **NHS 111 online** | Feature | Error summary listing every missing answer with links, rather than validating field-by-field as the patient moves. |

## Three decisions

**1. Hidden questions are not answered questions.** When a branch closes, its
answers are *dropped*. A form that submits "chest pain radiates: yes" for a
patient who revised their answer to "no chest pain" is submitting a fabrication.
Pruning loops until stable, because closing one branch can close another beneath
it.

**2. Red flags escalate, they do not score.** A questionnaire that quietly adds
points for "difficulty breathing" and shows a total at the end has buried the
only thing that mattered. `escalate` fires the moment a red-flag value is
chosen; the host decides whether that means a banner, a call, or an emergency
message.

**3. Validation runs on submit, not on blur.** Intake forms are long and often
completed by an unwell person; turning fields red as they move through is
punishing. The summary at the end names each missing question and links to it,
and `scroll-margin-top` clears the sticky header when you follow one.

## Accessibility

- Sections are `fieldset`/`legend`; choice groups carry `role="group"` or use
  `mat-radio-group` with a label.
- The error summary is `role="alert"` and focusable, so a failed submit
  announces what is missing rather than silently disabling a button.
- Missing answers are marked with a **rule beside the question** as well as
  colour, findable when scrolling a long form in greyscale.
- Progress counts only *visible* questions — counting hidden branches makes the
  bar jump backwards when one opens.

## Usage

```html
<app-health-questionnaire-form
  [questionnaire]="intake"
  [(answers)]="draft"
  [submitting]="submit.pending()"
  (escalate)="triage.raiseRedFlag($event)"
  (answersChange)="autosave.save($event)"
  (completed)="submit.send($event)"
/>
```

`answers` is two-way, so a host can restore a partially completed form; pair
`answersChange` with an autosave that writes server-side. Answers are PHI —
never to `localStorage`.
