# TransactionListItem

One row of a statement.

## API

```ts
type TransactionListItemProps = {
  transaction: {
    id: TransactionId;
    merchant: string;
    amount: Money;
    direction: 'debit' | 'credit';
    status: 'pending' | 'completed' | 'failed' | 'refunded' | 'reversed';
    date: string;
    category?: string;
    iconUri?: string;
  };
  onPress: () => void;
  onRetry?: () => Promise<void>;
};
```

## React 19

`useActionState` for retry, dispute and categorisation.

`useOptimistic` is acceptable for inserting a row the user just submitted —
**only while that row is visibly marked "Pending"**. Completion is a backend
event; this component never promotes a row to "completed" on its own.

## Accessibility

The sign and the status are words, not colours:

> "Blue Tokai Coffee, Debit, 450.00 rupees, Pending, 3 hours ago (6 Aug 2026,
> 09:15), Food & drink."

Every visual fragment carries `aria-hidden`, so the row is announced once as a
sentence rather than five times as pieces. `−₹450` is announced by several
screen readers as "hyphen 450", which is why the label says "Debit" instead.

## Notes

A retry must reuse the original idempotency key, or the bank takes the money
twice.
