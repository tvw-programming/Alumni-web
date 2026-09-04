# ApprovalRequestCard

An approval waiting on the viewer.

## API

```ts
type ApprovalRequestCardProps = {
  request: ApprovalRequest;
  onDecide: (decision: 'approve' | 'reject' | 'reassign', comment: string) => Promise<void>;
};
```

## Two rules

- **A rejection requires a reason.** An approval trail with "rejected" and no
  comment is unusable at review time, and the requester cannot act on it.
  Approving may be silent; rejecting may not — the Reject button stays disabled
  until a reason is typed.
- **"Already resolved" is a real state.** Two approvers open the same request
  constantly. The second must be told what happened, not shown a generic error —
  a 409 becomes an informational message, not a red one.

## React 19

`useActionState` carries the decision. Optimism is limited to the button's
pending presentation; the **final approval status comes from the server**, since
an approval is exactly the kind of decision a workflow rule can refuse.
