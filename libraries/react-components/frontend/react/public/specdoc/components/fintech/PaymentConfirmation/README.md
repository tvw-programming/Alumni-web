# PaymentConfirmation

The last screen before money moves.

## API

```ts
type PaymentConfirmationProps = {
  open: boolean;
  amount: Money;
  recipient: string;
  fundingSource: string;
  fee?: Money;
  riskNotice?: string;
  onConfirm: () => Promise<PaymentPhase>;
  onCancel: () => void;
};

type PaymentPhase = 'review' | 'authenticating' | 'submitted' | 'completed' | 'pending' | 'failed';
```

## The rule

**"Submitted" is not "completed".** A bank that has accepted a request has not
necessarily settled it. An app that says "Sent!" on acceptance teaches users to
stop checking — and a failed settlement is then discovered days later.

Each phase has its own wording:

| Phase     | Says                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| submitted | "Your bank has accepted the request. We will update this when it settles."             |
| completed | "The money has left your account."                                                     |
| pending   | "This is taking longer than usual. Do not send it again — check your statement first." |
| failed    | "No money has left your account."                                                      |

That last line matters: after a failure the user's first question is whether
they have been charged.

## React 19

`useActionState` carries the phase, and the phase comes from the server —
`useOptimistic` has no place on this screen.

## Not dismissable while in flight

`onClose` and Escape are disabled during the Action. A user who closes
mid-payment and retries is a user who pays twice.

## Notes

Send an `Idempotency-Key`. It is the single most important header here.
