# TransactionStatusSheet

The receipt.

## API

```ts
type TransactionStatusSheetProps = {
  open: boolean;
  outcome: 'success' | 'pending' | 'failed';
  amount: Money;
  recipient: string;
  reference?: string;
  completedAt?: string;
  failureReason?: string;
  onClose: () => void;
  onRetry?: () => void;
  onContactSupport?: () => void;
};
```

## What earns its place

- **The reference.** It is the first thing support asks for.
- **An explicit answer to "did my money leave?"** — every outcome states it:
  _"No money has left your account."_, _"The money has been debited and is being
  confirmed."_, _"The money has left your account."_ A failure screen that does
  not answer this sends the user to check their statement in a panic.
- **"Do not pay again"** on pending. Double payment is the expensive mistake.

## Accessibility

`role="status"` announces the outcome, the amount and the money question as one
sentence. The large glyphs and figures are `aria-hidden` so it is said once.
