# AddressPicker

## API

```ts
type AddressPickerProps = {
  addresses: PostalAddress[];
  selectedId?: string;
  onSelect: (id: string) => Promise<void>;
  onAddNew?: () => void;
};
```

## React 19

`useActionState`. The radio moves at once and the prop takes over when the
Action settles — which _is_ the rollback if the server refuses.

Selection is safe to predict: these are addresses the server already knows
about. The **consequences** are not — shipping cost and delivery date change
with the address, so the caller refetches totals instead of adjusting them.

## Accessibility

- A real `RadioGroup`, so arrow keys move between addresses.
- The whole card is one label: _"Tejasvi W., 402 Sunrise Residency, Baner Road,
  Pune 411045, Maharashtra, default address."_
- An undeliverable address stays listed, disabled, with the reason in the label
  and in red text. Removing it would leave the user hunting for an address that
  silently vanished.
