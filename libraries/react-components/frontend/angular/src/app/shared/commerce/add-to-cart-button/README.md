# AddToCartButton

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Amazon** | Design | Strong primary action placed beside product information; stable button width so the layout does not shift between states. |
| **Amazon** | Feature | Buy-now kept as a separate action from add-to-cart, never merged into one ambiguous button. |
| **Flipkart** | Design | Full-width primary CTA on the product page, compact icon-only form on grid cards. |
| **Flipkart** | Feature | "Choose options" when a variant is required, instead of silently adding a default size. |
| **Blinkit** | Design | Immediate add affordance on the card itself for groceries, with the button becoming a stepper once an item is in the cart. |
| **Blinkit** | Feature | Sticky mobile CTA that stays reachable while scrolling → the `floating` variant. |

## The state machine

```
idle → loading → added
              ↘ error → (retry) → loading
idle → chooseOptions → (variant selector)
idle → outOfStock → (notify me)
```

`state` is an **input**. The component receives an explicit result and never
infers success from a local click — so a failed cart mutation cannot leave a
button reading "Added".

## Accessibility

- Accessible name includes the product: on a grid of 40 cards, forty buttons
  labelled "Add to cart" are useless.
- `aria-busy` during the request; `role="status"` on success, `role="alert"` on
  failure.
- Confirmation is **persistent text**, not a toast — the brief warns against
  feedback that disappears before it is read.
- Fixed minimum width so the label change does not move the page.

## Usage

```html
<app-add-to-cart-button
  [state]="cart.stateFor(product.id)()"
  [productTitle]="product.title"
  (add)="cart.add(product.id, 1)"
  (chooseOptions)="scrollToVariants()"
  (retry)="cart.add(product.id, 1)"
  (viewCart)="router.navigate(['/cart'])"
/>
```
