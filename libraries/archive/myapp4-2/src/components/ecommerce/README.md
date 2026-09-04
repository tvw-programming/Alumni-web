# E-commerce Component Library

Domain layer for product discovery, cart, checkout and fulfilment. Built **on top
of** the base library in `src/components/` — it composes `AppCard`, `AppButton`,
`AppTextInput`, `AppSheet`, `RatingStars`, `SkeletonLoader`, `StateView`,
`SegmentedTabs` and the Toast/Sheet/Confirm providers rather than duplicating them.

## Folder structure

```
src/components/ecommerce/
├── theme/ecommerceTokens.ts      # semantic domain tokens (price.*, savings, availability, timeline.*)
├── types/
│   ├── domain.ts                 # ProductCardData, CartLine, Facet, Review, Address, DeliverySlot, …
│   └── sample.ts                 # typed loader for the *.sample.json files
│
├── ProductCard/                  + ProductMedia.tsx        (loading / loaded / broken states)
├── PriceTag/
├── QuantityStepper/
├── AddToCartButton/
├── Cart/                         CartLineItem + CartSummaryCard + MoneyRow
├── ImageCarousel/                ImageCarousel + ThumbnailStrip
├── VariantSelector/
├── FilterSortSheet/              + filterEngine.ts          (headless, serializable)
├── Reviews/                      ReviewCard + RatingBreakdown
├── AddressPicker/                AddressCard + AddressPicker
├── CouponInput/
└── Fulfillment/                  DeliverySlotPicker + OrderTrackerTimeline
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Shop UI** tab renders them
directly, so an example that drifts from its component fails the typecheck.

## Shared `Money`

Adding this library promoted `Money` out of the fintech folder into
`@ui/primitives/money`, since both domains need identical currency handling.
`@ui/fintech` re-exports it, so its public API is unchanged. Integer minor units,
`Intl`-derived precision and symbol placement, no floats anywhere.

## The one rule

> Keep UI components separate from pricing rules, inventory truth, delivery
> capacity, tax, serviceability, cart mutation, review moderation and order
> orchestration.

Enforced by construction, not convention:

| Component | What it deliberately cannot do |
|---|---|
| `PriceTag` | Compute a discount percentage. The label comes from the pricing service, so the number shown is the number checkout uses. |
| `QuantityStepper` | Own inventory. `max` and `disabledReason` are server-confirmed — and it always says *why* "+" is disabled. |
| `AddToCartButton` | Infer success from a tap. `state` is supplied from the server's answer. |
| `CartSummaryCard` | Hide a mandatory fee. Disclosure applies to breakdowns, never the payable total. |
| `VariantSelector` | Silently reassign an invalid selection. It flags the conflict and lets the user choose. |
| `FilterSortSheet` | Build a query. `filterEngine.ts` only manipulates and serializes state. |
| `CouponInput` | Decide eligibility. Validation is server-authoritative; the component renders the verdict. |
| `AddressPicker` | Require a map provider. Autocomplete is an adapter; manual entry always works. |
| `OrderTrackerTimeline` | Show a countdown on a delayed order. The headline becomes an explanation plus a next-update time. |

## Cross-cutting standards

**Never colour alone.** Discounts are labelled chips. Availability pairs an icon
with words. Selected swatches carry a ring *and* a checkmark *and* a text name.
Timeline states carry an icon and a status word. Debit/credit-style meaning is
never left to red versus green.

**Async vocabulary.** `AsyncState` spans `idle · loading · refreshing · success ·
empty · partial · unavailable · error · offline · stale`. Skeletons for
predictable content, inline errors for recoverable problems, full-page errors
only when the whole task is blocked.

**Accessibility.** A product card is *not* one giant ambiguous link: the product
region is one button with a composed name (brand, title, price, availability,
sponsored) and the wishlist toggle is separate and separately labelled. Image
alt text is a required field on `ImageAsset`. Add-to-cart, filter results and
gallery changes are announced. Star histogram bars expose name and value.

**Stable layout.** Fixed media aspect ratios, a fixed title line count, tabular
numerals on every price and quantity, and a reserved helper row — so a grid does
not reflow when one card's data differs.

## Tokens

`design-tokens/ecommerce.tokens.json` — light and dark, semantic names only:
`priceCurrent`/`priceCompare`/`priceDeal`, `savings`, `discountBadge`,
`availableStock`/`lowStock`/`outOfStock`, `deliveryFast`/`deliveryStandard`/`deliveryDelayed`,
`sponsored`, `swatchSelected`, `ratingFill`, and the timeline states.

Read them with `useShopTheme()`. No component in this folder accepts a hex value.

## Usage

```tsx
import { ProductCard, PriceTag, AddToCartButton } from '@ui/ecommerce';

<ProductCard
  product={product}
  variant="grid"
  onPress={openDetail}
  onWishlistToggle={toggleWishlist}
  primaryAction={
    <AddToCartButton state={cartState} productId={product.id} onAdd={addToCart} />
  }
/>
```

See the running app's **Shop UI** tab for all twelve, or read any
`*.usage.tsx` for the same examples in source form.
