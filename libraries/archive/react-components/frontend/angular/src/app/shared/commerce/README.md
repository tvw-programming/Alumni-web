# Commerce component library

Reusable Angular 22 components for product discovery, purchase decisions and
fulfilment feedback — ported from `libraries/react-components/frontend/react`
and specified against the benchmark brief.

## Architecture

- **Standalone, `OnPush`, signal `input()` / `output()`.** No `NgModule`, no
  `@Input` decorators, no `zone.js` reliance in component logic.
- **Material 3 system tokens** (`--mat-sys-*`) for every colour, so components
  inherit the app's theme instead of shipping their own palette.
- **Composition over configuration.** `ProductCard` renders price through
  `PriceTag` and the action through `AddToCartButton`; a pricing rule changes in
  one file, not in every surface that shows a price.
- **No business logic in components.** Inventory limits, pricing, delivery
  capacity, serviceability and cart mutation arrive as inputs and leave as
  outputs. A component that decides for itself whether stock allows one more is
  a component that disagrees with checkout.

Each folder carries: the component (`.ts` / `.html` / `.scss`), a
`*.sample.json` of every edge case from the brief, a `*.usage.ts` runnable
gallery built from that JSON, and a `README.md` naming the benchmark apps.

## Benchmark matrix

Which app each pattern comes from, and whether it is **design** (how it looks
and is laid out) or **feature** (what it must handle). These are reusable
design-system specifications, not replicas of proprietary interfaces.

| Component | Design references | Feature references |
|---|---|---|
| **ProductCard** | Amazon (dense scan path, clamped title, sponsored labelling) · Flipkart (badge placement off the title) · Myntra (large fashion imagery, brand/description separation, chip promos) | Amazon (location-checked delivery promise) · Flipkart (`Only a few left`) · Myntra (swatches + wishlist on card) · Blinkit/Instacart (unit price, minutes-level ETA) |
| **PriceTag** | Amazon (price hierarchy, strikethrough MRP, compact discount label) · Flipkart (percentage adjacent to price) · Myntra (sale-price prominence) | Amazon (member pricing without hiding base price) · Flipkart (stacked promotions) |
| **QuantityStepper** | Blinkit (compact fast-tap control) · Instacart (grid-density legibility) | Instacart (fractional weight units) · Amazon (inline editing inside the cart) |
| **AddToCartButton** | Amazon (strong primary action, stable width) · Flipkart (full-width vs compact) · Blinkit (immediate add, sticky mobile CTA) | Flipkart (choose-options instead of defaulting a size) · Amazon (buy-now separate from add-to-cart) |
| **VariantSelector** | Nike (sizes shown upfront, unavailable greyed rather than hidden) · Myntra (colour/size/fit exploration) | Amazon (dependent combinations: seller × size × pack) · Nike (size guide beside the selector) |
| **ImageCarousel / ThumbnailStrip** | Nike (image-led product storytelling) · Amazon (multiple views + zoom) · Myntra (lifestyle and fit imagery) | Amazon (video in gallery, deep link to an image) · Nike (variant colour changes the gallery without resetting position) |
| **CartLineItem / CartSummaryCard** | Amazon (inline editing, save-for-later, cart totals hierarchy) · Flipkart (line-level delivery messaging) | Instacart (substitutions, refunds, shopper approval) · Amazon (split shipments, fee transparency before payment) |
| **FilterSortSheet** | Amazon / Flipkart (multi-dimension facets for broad catalogues) · Myntra (fashion facets: size, fit, colour, discount) | Amazon (facet counts, search within long brand lists) · Myntra (size-availability filters that reflect real buyability) |
| **ReviewCard / RatingBreakdown** | Amazon (star histogram, verified badges, media reviews) · Myntra (fit and size context) · Nike (product-specific review context) | Amazon (star/verified/media filtering, helpful votes) · Myntra (true-to-size data when user-provided) |
| **AddressCard / AddressPicker** | Amazon (saved addresses in checkout) · Flipkart (Home/Work labels, obvious selection state) | Instacart (serviceability drives store, substitutions and timing) · Amazon (recalculate ETA, fee and tax on address change) |
| **CouponInput** | Amazon / Flipkart (coupon discovery with direct clipping) · Myntra (offer sections tied to cart value or payment method) | Amazon (specific error copy: expired, minimum not met, not combinable) · Flipkart (auto-applied vs manual distinction) |
| **DeliverySlotPicker / OrderTrackerTimeline** | Blinkit (prominent "arriving in" timer, real-time status) · Amazon (delivery windows, shipment-level tracking) | Instacart (shopper-mediated flow: shopping started, replacement requested, approval) · Amazon (multi-package order organisation) |

## Cross-component standards

- **Availability is a union, never a boolean.** `inStock: false` cannot tell
  "sold out" from "we have not checked your pincode", and those need different
  words.
- **Money is minor units plus a currency**, never a float. Discount percentages
  are computed once in `_core/money.ts` and floored — rounding 49.6% up to
  "50% off" contradicts the checkout total.
- **Never colour alone** for availability, savings or order status.
- **Reduced motion** respected by every animated surface.
- **Announcements** for add-to-cart, price, filter and delivery changes.

## Build status

| Component | State |
|---|---|
| `_core` (types, money) | Complete |
| `PriceTag` | Complete — component, samples, usage, README |
| `QuantityStepper` | Complete |
| `AddToCartButton` | Complete |
| `ProductCard` | Complete |
| `VariantSelector` | Folder created, specified in this matrix, not yet implemented |
| `ImageCarousel` | Folder created, not yet implemented |
| `CartLineItem` | Folder created, not yet implemented |
| `ReviewCard` | Folder created, not yet implemented |
| `CouponInput` | Folder created, not yet implemented |
| `AddressCard` | Folder created, not yet implemented |
| `FilterSortSheet` | Folder created, not yet implemented |
| `DeliverySlotPicker` | Folder created, not yet implemented |
