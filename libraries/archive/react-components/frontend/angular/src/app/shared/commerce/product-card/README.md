# ProductCard

## Benchmark references

| App | Kind | What we took |
|---|---|---|
| **Amazon** | Design | Dense scan path — image dominates, title clamped to a predictable line count, then price → rating → delivery → badges in a fixed order so the eye learns one route across a whole grid. |
| **Amazon** | Design | Sponsored products visually labelled and separated from the product title. |
| **Amazon** | Feature | Delivery promise on the card itself, but only once checked for the user's location. |
| **Flipkart** | Design | Assured / sale / limited-stock badges kept out of the title area, overlaid on the media instead. |
| **Flipkart** | Feature | Availability messaging on the card (`Only a few left`) rather than only on the product page. |
| **Myntra** | Design | Larger fashion imagery, more white space, brand name typographically separated from the product description. |
| **Myntra** | Design | Promotional labels as compact chips rather than banners. |
| **Myntra** | Feature | Colour swatches and a wishlist affordance directly on the card. |
| **Blinkit / Instacart** | Feature | Grocery treatment — unit price and a minutes-level ETA carry more weight than a date. |

## The accessibility decision that shapes the markup

**The card is not one giant link.** A whole-card anchor swallows the wishlist
and cart buttons inside it, so a screen-reader user gets one control whose
accessible name is the entire card. Instead:

- the **title** is the link, and its `aria-label` carries brand, product and
  availability — what you need before deciding to open it;
- **wishlist** and **add to cart** are siblings of the link, separately labelled;
- swatches always carry a visually-hidden text name, never colour alone;
- `alt` is required by the type, because an empty alt on a product image is a bug.

## Composition

Price rendering belongs to `PriceTag`, the action to `AddToCartButton`. This
component owns layout and scan order only, so a pricing rule changes in one
place rather than in every surface that shows a price.

One piece of logic it does own: **out-of-stock outranks the caller's
`cartState`**. A card offering to add an unavailable item is worse than one
saying it is unavailable.

## Layout stability

`aspect-ratio` on the media and a two-line clamp on the title keep every card in
a row the same height, so images arriving one by one do not reflow the grid. The
skeleton occupies the reserved box rather than appearing beside it.

## Usage

```html
<app-product-card
  [product]="product"
  layout="grid"
  [cartState]="cart.stateFor(product.id)()"
  [wishlisted]="wishlist.has(product.id)()"
  (addToCart)="cart.add($event, 1)"
  (toggleWishlist)="wishlist.toggle($event)"
/>
```
