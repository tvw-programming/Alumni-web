# AmountKeypad

A numeric pad for entering an amount.

## API

```ts
type AmountKeypadProps = {
  value: string; // minor units as a digit string: "125000" is ₹1,250.00
  currency: string;
  max?: Money;
  min?: Money;
  helperText?: string;
  onChange: (nextMinorUnits: string) => void;
};
```

## Why a string

`"12345"` stays a string until it becomes a `bigint`, so there is no point at
which a float could round it. Typing appends digits — which is also why there is
no decimal key, and why a leading zero is stripped: `"0500"` and `"500"` would
otherwise be two representations of one amount, and two is one too many when
they get compared for equality.

## React 19

None. Entering an amount is not a mutation — the Action belongs to whatever
confirms the payment.

## Accessibility

- The amount is an `aria-live="polite"` region announcing _"Amount, 1,250
  rupees"_, so the user hears the running total rather than each keystroke.
- Limit breaches switch the helper text to `role="alert"`.
- Backspace is labelled "Delete last digit", not "backspace".
