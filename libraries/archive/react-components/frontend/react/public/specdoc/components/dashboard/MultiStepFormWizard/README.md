# MultiStepFormWizard

A stepped form.

## API

```ts
type MultiStepFormWizardProps = {
  steps: WizardStep[]; // { id, label, optional?, render, validate? }
  initialValues?: Record<string, unknown>;
  submitLabel?: string;
  onSubmit: (values) => Promise<void>;
};
```

## Validation is per step, on Next

A wizard that accepts four screens of input and then reports an error on screen
one has wasted the user's time and hidden which screen is wrong.

Errors clear as the field is edited — keeping a message under a field the user
is fixing is just noise.

## Values survive Back

Held for the whole wizard, so going back never loses what was typed. That is the
single most common complaint about multi-step forms, and Back deliberately skips
validation.

## React 19

**Only the final submit is an Action.** Moving between steps is local: nothing
has been committed yet, and a server round trip per step turns a form into a
queue.

## Accessibility

The visual `Stepper` is silent to a screen reader, so a `role="status"` line
announces _"Step 2 of 3: Contact"_, and failures announce the count through
`role="alert"`.
