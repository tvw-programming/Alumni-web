# CouponInput

## API

```ts
type CouponInputProps = {
  value: string;
  state: 'idle' | 'validating' | 'applied' | 'invalid' | 'expired' | 'error';
  message?: string;
  discount?: Money;
  onChange: (value: string) => void;
  onApply: () => Promise<void>;
  onRemove?: () => Promise<void>;
};
```

Controlled, and the Action lives with the parent — an applied coupon changes the
cart totals, which live above this input.

## The rule

**Do not clear the code on failure, and do not move focus.** Clearing forces the
user to retype a fifteen-character string to fix one typo. This is the single
most common complaint about coupon fields.

## React 19

`useActionState` in the parent (see `usage.tsx`), which owns the resulting
discount. `useFormStatus` is the alternative when the field sits inside a real
`<form action={…}>` — read it from a _descendant_ submit button, never from the
component that renders the form.

## Messages

Specific, from the server:

- "Code expired on 31 July."
- "Add ₹500 more to use this offer."
- "This code applies only to selected products."

Not "Invalid code" — that tells the user nothing they can act on.

## State matrix

| State                     | Renders                                                     |
| ------------------------- | ----------------------------------------------------------- |
| idle                      | empty helper line (height reserved)                         |
| validating                | spinner in the button, field disabled                       |
| applied                   | the field is replaced by a deletable chip with the discount |
| invalid / expired / error | red field, `role="alert"` message, **value preserved**      |

## Accessibility

- The helper text is `aria-describedby` the field and switches between
  `role="status"` and `role="alert"` by severity.
- Its height is reserved, so a message cannot push the checkout button down
  under the user's cursor.
- Enter submits; `autoCapitalize="characters"`, `spellCheck={false}`.
