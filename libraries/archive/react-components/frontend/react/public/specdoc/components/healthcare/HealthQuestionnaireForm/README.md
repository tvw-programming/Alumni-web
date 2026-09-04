# HealthQuestionnaireForm

A schema-driven clinical questionnaire with branching.

## API

```ts
type HealthQuestionnaireFormProps = {
  schema: QuestionnaireSchema; // { id, version, sections, branchingRules }
  initialValues?: Record<string, unknown>;
  onSaveDraft?: (values) => Promise<void>;
  onSubmit: (values, version: string) => Promise<void>;
};
```

## Three decisions

- **The schema is versioned and the version is submitted with the answers.**
  Question 4 in v2 is not question 4 in v3; an answer set without its version
  cannot be interpreted later.
- **"Prefer not to answer" and "Not sure" are real options**, distinct from an
  empty field. Silence is not a clinical finding, and forcing an answer produces
  false data.
- **Submitted answers are never optimistic.** A draft-saved indicator may be;
  the answers may not.

## React 19

`useActionState` for validation and submission. Validation failures come back as
`fieldErrors` on the result, so messages sit beside their inputs rather than in a
toast that disappears before a long form can be corrected.

`useFormStatus` is the alternative for the submit button when the form is a real
`<form action={…}>` — read from a _descendant_, never from the component
rendering the form.

## Accessibility

- The progress bar announces _"4 of 7 questions answered"_.
- On failure the first invalid field is scrolled into view and the count is
  announced through `role="alert"`.
- Branching hides questions from the DOM entirely, so a hidden question is not
  a tab stop.

## Privacy

Drafts contain clinical answers. Store them where the rest of the patient record
lives, encrypted, and never in `localStorage`.
