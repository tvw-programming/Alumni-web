# Delivery & Home Service Component Library

Domain layer for on-demand booking: browsing services, choosing a provider,
picking a slot, reviewing price, tracking a live job, and closing it out
(rating or canceling). Built **on top of** the base library in
`src/components/` — it composes `AppCard`, `AppButton`, `AppSheet`,
`FilterChipGroup`, `SkeletonLoader`, the promoted `MoneyRow`, and the
Toast/Sheet providers rather than duplicating them.

## Folder structure

```
src/components/ondemand/
├── theme/ondemandTokens.ts       # surfaceService/Selected/Map, status*, verified, otp*, track*, focusRing
├── types/domain.ts               # ServiceCategory, ServiceProvider, BookingSummary, TimeSlot, Agent, …
│
├── ServiceCategoryTile/
├── ServiceProviderCard/
├── SlotBookingCalendar/
├── AddOnServiceList/
├── PriceBreakdownSheet/          # inline or AppSheet, built on the shared MoneyRow
├── BookingSummaryCard/           # also built on MoneyRow
├── OrderStatusTimeline/
├── LiveTrackingCard/
├── AgentInfoCard/
├── RatingFeedbackDialog/
└── CancelReasonSheet/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Services UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`Money` / `formatMoney`** (`@ui/primitives/money`) — the same minor-units
  model fintech and e-commerce use for price, fee, and cancellation-fee
  amounts.
- **`ImageAsset` / `Rating`** (`@ui/primitives/media`) — provider avatars and
  star ratings share the exact shape ProductCard and ServiceProviderCard both
  read.
- **`MoneyRow`** (`@ui/molecules/MoneyRow`) — originally an ecommerce-local
  row, promoted to the base library for this domain's `PriceBreakdownSheet`
  and `BookingSummaryCard`. Its `onExplain` affordance (added here) lets a fee
  line expand into plain-language text without a second component.
- **`FilterChipGroup`** (`@ui/molecules`) — powers `RatingFeedbackDialog`'s
  rating-conditional tag chips.
- **`AppSheet`** (`@ui/organisms`) — the same bottom-sheet/dialog primitive
  healthcare's `ConsentDialog` and ecommerce's `FilterSortSheet` use, here
  backing `PriceBreakdownSheet`, `RatingFeedbackDialog`, and
  `CancelReasonSheet`.

## The one rule

> Transparency at every commitment point. Before a user confirms anything they
> should be able to answer: what am I booking, who will provide it, when will
> it happen, how much will it cost, how do I reach them, and what does
> cancelling or something going wrong actually mean.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `ServiceCategoryTile` | Hide an unavailable category. It stays in the grid with a stated reason instead of disappearing. |
| `ServiceProviderCard` | Let "Verified" stand alone. The badge routes to what was actually checked, and every rating states its sample size. |
| `SlotBookingCalendar` | Omit the timezone, or hide `held` slots to make availability look better than it is. |
| `AddOnServiceList` | Remove a disabled add-on or strike it through with no explanation — `disabledReason` is always shown. |
| `PriceBreakdownSheet` | Change the total without saying why. A `changed` status always renders `changedNote` next to the new total. |
| `BookingSummaryCard` | Bundle "what/who/when/where" into one block. Each fact gets its own labelled Change action, and Confirm is disabled while still validating. |
| `OrderStatusTimeline` | Show a ticking countdown once the feed goes stale — it's replaced with an honest status and last-updated time. |
| `LiveTrackingCard` | Render the map without a text sentence alternative, or keep any location detail once `trackingStatus` is `ended`. |
| `AgentInfoCard` | Auto-reveal or auto-announce the handoff code. It's hidden until tapped, and copying is an explicit, confirmed action. |
| `RatingFeedbackDialog` | Gate submission behind a comment. A star rating alone is a complete, submittable answer. |
| `CancelReasonSheet` | Cancel from a single tap or make "Keep booking" the visually smaller option — both are full-size, and the fee is disclosed right above Confirm. |

## Cross-cutting standards

**Never colour alone.** Availability, verification, tracking, and OTP status
all pair an icon and a text label with any colour — see `ServiceProviderCard`'s
availability chip and `OrderStatusTimeline`'s step icons.

**Optimistic UI stays in the screen, not the component.** Every presentational
component here only emits intent (`onConfirm`, `onFollow`-style callbacks);
the accompanying `*.usage.tsx` owns the simulated async delay, optimistic
update, and rollback-with-retry.

**Location is minimized after the fact.** `LiveTrackingCard` drops origin,
destination, and provider-location fields the instant a trip ends — there is
no "ended" render path that still shows a pin.

**Codes are never spoken by default.** `AgentInfoCard`'s OTP/PIN is rendered
only after an explicit reveal tap, uses `accessibilityLabel` with spaced
digits rather than relying on visual grouping, and expires with a visible
countdown rather than silently going stale.

## Tokens

`design-tokens/ondemand.tokens.json` — light and dark, semantic names only:
`surfaceService`/`Selected`/`Map`, `status*` (Searching/Assigned/EnRoute/
Arrived/InProgress/Completed/Delayed/Canceled/Failed/Stale), `verified`,
`ratingFill`, `availableNow`/`limitedAvailability`/`unavailable`, `fee*`,
`discount`, `otpSurface`/`onOtpSurface`/`otpBorder`, `trackLive`/`Stale`/`Ended`,
`focusRing`.

Read them with `useServiceTheme()`. No component in this folder accepts a hex
value.

## Usage

```tsx
import { ServiceProviderCard, BookingSummaryCard, PriceBreakdownSheet } from '@ui/ondemand';

<ServiceProviderCard
  provider={{ ...provider, favorited: favorites.includes(provider.id) }}
  onBook={(item) => book(item)}
  onFavorite={(item, next) => toggleFavorite(item.id, next)}   // caller owns the mutation
  onExplainVerification={(item) => openSheet(item.verificationScope)}
/>
```

See the running app's **Services UI** tab for all eleven, or read any
`*.usage.tsx` for the same examples in source form.
