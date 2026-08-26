# Real Estate & PropTech Component Library (React Native Paper)

Domain layer for property discovery, filtering, media, agent contact,
financing, locality context, visit scheduling, comparison, saved searches,
and document verification. Built directly on **React Native Paper**
primitives per the spec's own component guide — `Card`, `Chip`, `Checkbox`,
`RadioButton`, `List.Item`/`List.Accordion`, `Menu`, `SegmentedButtons`,
`TextInput`, `Badge`, and `Dialog`/`Portal` via the shared `AppSheet` — plus
`@react-native-community/slider` for the EMI calculator, since Paper has no
slider primitive.

## Folder structure

```
src/components/realestate/
├── theme/realestateTokens.ts   # surface/background, status*, price*, doc*, focus
├── types/domain.ts             # PropertySummary, PropertyFilterState, PropertyAgent, …
│
├── PropertyStatusChip/         # built first — reused by PropertyCard
├── PropertyCard/
├── PropertyFilterSheet/
├── AmenityGrid/
├── PropertyMedia/              # FloorPlanViewer + ImageGalleryGrid
├── AgentContactCard/
├── EMICalculatorCard/          # built on the shared MoneyRow
├── LocalityInsightsCard/
├── SiteVisitSchedulerSheet/
├── ComparePropertiesTable/
├── SavedSearchAndTrend/        # SavedSearchItem + PriceTrendChart
└── DocumentChecklistItem/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Property UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`Money` / `formatMoney`** (`@ui/primitives/money`) — the same
  minor-units model every other domain uses for listing prices, rent, and
  EMI figures.
- **`ImageAsset`** (`@ui/primitives/media`) — property photos, floor plans,
  and agent avatars share the exact shape every other domain's media fields
  use.
- **`MoneyRow`** (`@ui/molecules/MoneyRow`) — reused as-is by
  `EMICalculatorCard` for principal, interest, fee, and total repayment
  lines.
- **`AppSheet`** (`@ui/organisms`) — backs `PropertyFilterSheet`,
  `SiteVisitSchedulerSheet`, and the fullscreen viewer in `ImageGalleryGrid`,
  the same Portal-based primitive every other domain's dialogs and sheets
  use.
- **`FilterChipGroup`** (`@ui/molecules`) — powers `PropertyFilterSheet`'s
  BHK, furnishing, availability, and amenity multi-select sections.
- **`PropertyStatusChip`** is composed inside `PropertyCard`'s status
  overlay and inline status row — one implementation, reused wherever a
  status needs to render.

## The one rule

> Trust through explicit evidence. Users should understand a property's
> price, configuration, area, status, location context, verification scope,
> financing estimate, visit availability, and document state before making a
> high-consequence decision.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `PropertyCard` | Hide a sold, rented, or unavailable listing — it stays visible with an honest status overlay instead of disappearing from a saved list. |
| `PropertyStatusChip` | Use bright alarm-red for sold/rented — every status uses a muted, scannable colour paired with an icon and a word. |
| `PropertyFilterSheet` | Leave the consequence of a filter change hidden — the result count near Apply updates live. |
| `AmenityGrid` | Use a generic accessibility icon in place of a real description, or treat "paid" the same as "included." |
| `FloorPlanViewer` / `ImageGalleryGrid` | Make room discovery depend on colour-coded polygons alone — every floor ships a plain-text room list. |
| `AgentContactCard` | Merge Call and WhatsApp into one ambiguous action, or expose a raw phone number. |
| `EMICalculatorCard` | Imply loan approval from an estimate — the disclaimer and "Estimated" label are always visible, and every slider has a numeric text-input alternative. |
| `LocalityInsightsCard` | Make an unsourced "best locality" claim — every insight states its distance, source, and freshness. |
| `SiteVisitSchedulerSheet` | Conflate "pending confirmation" with "confirmed" — they're always distinct, separately rendered states. |
| `ComparePropertiesTable` | Render missing data as "No" — it always reads "Not provided," since absence of data is never proof an amenity doesn't exist. |
| `SavedSearchItem` / `PriceTrendChart` | Frame a price trend as investment advice — the chart always closes with a neutral historical-data disclaimer. |
| `DocumentChecklistItem` | Show a verified checkmark for a merely-uploaded file — "Uploaded" and "Verified" are always visually and textually distinct. |

## Cross-cutting standards

**Never colour alone.** Property status, amenity availability, document
status, and price-trend direction all pair an icon and a text label with
any colour.

**Domain components stay thin.** `PropertyStatusChip` never infers "ready"
from a possession date; `EMICalculatorCard` keeps the EMI formula in one
pure function rather than duplicating it; `DocumentChecklistItem` never
implies legal verification on its own. Every `*.usage.tsx` owns the
simulated async delay that stands in for these services.

**Freshness is explicit.** `DataFreshness` (`lastUpdatedAt`, `source`,
`status`) is threaded through property summaries so a stale listing renders
a visible warning rather than looking as current as a fresh one.

**Privacy by construction.** `AgentContactCard` never renders a raw phone
number — Call and WhatsApp both route through the host screen's masked-relay
implementation via `onCall`/`onWhatsApp`.

## Tokens

`design-tokens/realestate.tokens.json` — light and dark, semantic names
only: `background`/`surface`/`surfaceVariant`, `verified`/`ready`/
`underConstruction`/`sold`/`newLaunch`/`priceReduced`/`pending`,
`priceUp`/`Down`/`Flat`, `docNotStarted`/`Uploaded`/`Verified`/`Rejected`,
`focus`.

Read them with `usePropertyTheme()`. No component in this folder accepts a
hex value.

## Usage

```tsx
import { PropertyCard, PropertyFilterSheet, EMICalculatorCard } from '@ui/realestate';

<PropertyCard
  property={property}
  saved={savedIds.includes(property.id)}
  onPress={(item) => openDetail(item)}
  onToggleSave={(item) => toggleWatchlist(item.id)}   // caller owns persistence
/>
```

See the running app's **Property UI** tab for all twelve, or read any
`*.usage.tsx` for the same examples in source form.
