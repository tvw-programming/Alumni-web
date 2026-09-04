# ProductVariantSelector

## API

```ts
type ProductVariantSelectorProps = {
  groups: VariantGroup[];
  value: Record<string, VariantId | undefined>;
  onChange: (groupName: string, optionId: VariantId) => void;
};
```

Fully controlled — the parent owns the selection, because the add-to-cart call
needs it too.

## React 19

None. Selection is local until something is bought; the Action belongs to
`AddToCartButton`. Reaching for `useOptimistic` here would predict a value the
server was never asked about.

## Accessibility

- `role="radiogroup"` per group, `role="radio"` + `aria-checked` per option, so
  a screen reader announces position and arrows move between choices.
- Unavailable options stay visible, disabled, struck through, and say
  "unavailable" in the label — colour is not the signal.
- The selected value is repeated as text beside the group name.

## Why unavailable options are not removed

Hiding a sold-out size hides that the product comes in that size at all. "We do
not have your size right now" is more useful than silence, and it is what stops
a user re-searching for something that does not exist.
