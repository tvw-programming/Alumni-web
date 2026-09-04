# StatementFilterSheet

## API

```ts
type StatementFilterSheetProps = {
  open: boolean;
  value: StatementFilters;
  availableCategories: string[];
  matchCount?: number;
  onClose: () => void;
  onApply: (filters: StatementFilters) => void;
};
```

## Why a draft

The draft is local and only leaves on Apply. Live-applying each toggle refetches
four times while the user is still deciding — on a statement, four full-table
scans.

`matchCount` is what makes the draft worth having: **"Apply · 42 results"** turns
a blind commit into an informed one.

"Clear" resets the draft, not the applied filters. Nothing changes on the
statement until Apply.

## React 19

None. Filtering is query state, not a mutation. Put the applied filters in the
URL so a filtered statement can be shared and survives a reload.

## Accessibility

Every group has a `FormLabel` tied by `aria-labelledby`; category chips are
buttons carrying `aria-pressed`. "Money out" / "Money in" rather than
"debit" / "credit" — the plain words are what people scanning a statement use.
