# ProductCard

A catalogue tile in three densities: `grid`, `list`, `compact`.

## API

```ts
type ProductCardProps = {
  product: ProductSummary;
  variant?: 'grid' | 'list' | 'compact';
  saved?: boolean;
  onPress: () => void;
  onToggleSaved?: (next: boolean) => Promise<void>;
  onAddToCart?: () => Promise<void>;
};
```

Fully controlled. `saved` is the server's value; the component predicts the next
one but never owns it.

## React 19

| Interaction     | Hook             | Why                                                                                                                                     |
| --------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Wishlist toggle | `useOptimistic`  | the user's own preference — it cannot be refused for a business reason, and React restores the authoritative value if the request fails |
| Add to cart     | `useActionState` | the server can reject it: price moved, stock ran out, variant gone                                                                      |

**Never infer a successful cart mutation from the tap.** The button shows
"Adding…" while the Action is pending and reports the outcome underneath, in an
`aria-live` region.

## State matrix

| State        | Renders                                                |
| ------------ | ------------------------------------------------------ |
| `available`  | outlined "In stock" chip, cart button enabled          |
| `lowStock`   | filled "Only a few left" chip                          |
| `outOfStock` | 75% opacity, chip, cart button disabled and relabelled |
| `unknown`    | "Availability unknown", cart button still enabled      |
| adding       | button disabled, label "Adding…"                       |
| added        | "Added to cart" announced politely                     |
| add failed   | the server's message, announced politely               |

## Accessibility

- The image carries `alt=""` — the accessible name is on the action area, and
  repeating it makes a screen reader say the title twice.
- One complete label: _"Aurora Running Shoe, Northwind, ₹8,995.00, reduced from
  ₹11,995.00, rated 4.4 out of 5, 1,284 reviews, Only a few left."_
- Navigation, wishlist and cart are three separate targets.
- Availability is stated in words; colour only reinforces it.
- The wishlist button carries `aria-pressed`.

## Performance

- `memo`, so a catalogue re-render does not touch every tile.
- Fixed `aspectRatio` on the image, so arriving images cannot shift the grid.
- Two-line clamp on the title, so a long name cannot change tile height.
- Pair with a virtualised list for long catalogues.

## Security and privacy

No PII. `imageUri` is rendered as given — pass a URL from your own CDN, not one
a seller controls, or an attacker chooses what your users' browsers request.
