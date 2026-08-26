# ConsentDialog

Informed consent.

## API

```ts
type ConsentDialogProps = {
  open: boolean;
  title: string;
  purpose: string;
  clauses: ConsentClause[]; // { id, text, required }
  version: string;
  onAccept: (accepted: string[], version: string) => Promise<void>;
  onDecline: () => void;
};
```

## Three rules, legal rather than aesthetic

1. **Nothing is pre-ticked.** A pre-ticked box is not consent in any
   jurisdiction that has examined the question.
2. **Optional clauses are separable.** Bundling research consent into treatment
   consent invalidates the treatment consent.
3. **The version is stored with the acceptance.** A later edit of the text must
   not retroactively change what was agreed to.

**Decline is a real button.** An X in the corner does not record a refusal, and
a refusal is something the record needs.

## React 19

`useActionState`. The dialog does not close until the consent is stored — a
consent that failed to save while the UI moved on is a treatment given without
a record of agreement.
