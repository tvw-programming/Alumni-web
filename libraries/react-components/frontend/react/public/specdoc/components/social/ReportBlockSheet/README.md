# ReportBlockSheet

Report, and optionally block.

## API

```ts
type ReportBlockSheetProps = {
  open: boolean;
  subjectLabel: string;
  reasons: ReportReason[];
  onClose: () => void;
  onSubmit: (input: { reason: string; details: string; alsoBlock: boolean }) => Promise<void>;
};
```

## Blocking is a separate checkbox

Not an automatic consequence of reporting. They are different decisions — a user
may want a moderator to see something without cutting contact — and bundling
them removes that choice.

## The confirmation says what happens next

_"A moderator will review this within 24 hours."_ "Thanks for reporting" with no
timeline teaches people that reporting does nothing.

## Details

- Each reason carries a description; the categories are rarely
  self-explanatory, and a mis-categorised report is a slower one.
- Free text is optional. Requiring it suppresses reports.
- `useActionState`, and the sheet does not close until the report is stored.
