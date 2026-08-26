# PaymentMethodSelector

## API

```ts
type PaymentMethodSelectorProps = {
  methods: PaymentMethod[]; // { id, kind, label, hint, balance?, expiresOn?, unavailableReason? }
  selectedId?: string;
  onSelect: (id: string) => void;
};
```

## Security

`hint` is a last-four or a handle, **never the full instrument number**. A
component that _can_ render a PAN is a component that eventually renders one
into a log, a screenshot or an analytics payload.

## React 19

None. Selection is not a mutation; the payment Action that follows is where the
server gets a say.

## Accessibility

- Real `RadioGroup` — arrow keys move between methods.
- One label per method: _"Wallet, Prepaid balance, balance ₹345.00, Balance is
  lower than this payment."_
- An unusable method stays listed and disabled with the reason attached, rather
  than vanishing.
