# Travel, Hospitality & Booking Component Library

Domain layer for flight and stay search, results, room selection, pricing,
itineraries, traveler details, tickets, and post-booking policy. Built **on
top of** the base library in `src/components/` — it composes `AppCard`,
`AppButton`, `AppTextInput`, `AppSheet`, `DateRangePicker`, `SkeletonLoader`,
the promoted `MoneyRow`, and `List.Accordion` rather than duplicating them.

## Folder structure

```
src/components/travel/
├── theme/travelTokens.ts         # surfaceSearch/Ticket, cheapest/bestValue/highDemand,
│                                  # free/partialRefund/nonRefundable, status*, focusRing
├── types/domain.ts               # SearchQuery, FlightOffer, HotelCardData, RoomRate,
│                                  # ItineraryEvent, Traveller, BookingTicket, …
│
├── SearchWidget/                 # composes GuestRoomSelector + DateRangePicker in sheets
├── FlightResultCard/
├── HotelCard/                    + PropertyMedia.tsx (loading/loaded/broken image)
├── RoomTypeCard/
├── GuestRoomSelector/
├── FareBreakdownAccordion/       # built on the shared MoneyRow
├── AmenityIconGrid/
├── ItineraryTimeline/
├── TravellerDetailsForm/
├── BookingTicketCard/            + BarcodeView.tsx (decorative bars + mandatory text code)
├── PriceCalendarStrip/
├── CancellationPolicyCard/
└── ReviewSummaryCard/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Travel UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`Money` / `formatMoney`** (`@ui/primitives/money`) — the same minor-units
  model every other domain uses for fares, room prices, and fee lines.
- **`ImageAsset` / `Rating`** (`@ui/primitives/media`) — property photos and
  guest ratings share the exact shape ProductCard and ServiceProviderCard
  already read.
- **`MoneyRow`** (`@ui/molecules/MoneyRow`) — reused as-is by
  `FareBreakdownAccordion` for every base/tax/fee/discount line, including its
  `onExplain` affordance (originally added for on-demand pricing) for
  per-line fee explanations.
- **`DateRangePicker`** (`@ui/molecules`) — powers `SearchWidget`'s date
  editor sheet.
- **`AppSheet`** (`@ui/organisms`) — backs `SearchWidget`'s full-screen
  location editor and bottom-sheet date/traveler editors, the same primitive
  healthcare's `ConsentDialog` and on-demand's `CancelReasonSheet` use.
- **`GuestRoomSelector`** is both a standalone component (#5) and the
  traveler/room editor embedded inside `SearchWidget` — one implementation,
  two call sites.

## The one rule

> Decision transparency. Before a traveler commits, the system should make
> destination, dates, occupancy, itinerary, inclusions, total cost,
> cancellation consequences, and booking status understandable without
> requiring several hidden screens.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `SearchWidget` | Validate inventory or fares itself. It only emits a normalized `SearchQuery` — the search service owns everything past "is this submittable." |
| `FlightResultCard` | Hide a self-transfer or airport-change connection behind a detail screen — the warning renders on the card. |
| `HotelCard` | Show "Free cancellation" without the deadline that makes it true. |
| `RoomTypeCard` | Present a room as available when only one particular rate plan is — room and rate render as one selectable unit. |
| `GuestRoomSelector` | Silently add a room when occupancy is exceeded. It warns and asks instead. |
| `FareBreakdownAccordion` | Conceal a mandatory fee until after payment, or change a total without a `changedNote` explaining why. |
| `AmenityIconGrid` | Let a generic accessibility icon substitute for step-free entrance, an accessible bathroom, or elevator details. |
| `ItineraryTimeline` | Show a local time without its timezone label, even when the whole trip stays in one zone. |
| `TravellerDetailsForm` | Copy the booker's contact details onto another traveler silently — "same as booker" is an explicit, visible checkbox. |
| `BookingTicketCard` | Let the confirmation code become unreadable when the barcode is expired or unavailable — the human-readable code is the primary path, not a fallback. |
| `PriceCalendarStrip` | Present a predicted price as a guarantee — it's a trend, and "prices may change" is always visible, not in a tooltip. |
| `CancellationPolicyCard` | Say "Flexible cancellation" without a deadline and the refund percentage that follows it. |
| `ReviewSummaryCard` | Show a category score as a bare progress bar — every bar carries an explicit numeric label, and a low review count is flagged rather than presented with false confidence. |

## Cross-cutting standards

**Never colour alone.** Cheapest/best-value/high-demand calendar labels,
availability chips, and cancellation badges all pair an icon and a word with
any colour.

**Optimistic UI stays in the screen, not the component.** Every presentational
component here only emits intent (`onSearch`, `onSelect`, `onSubmit`-style
callbacks); the accompanying `*.usage.tsx` owns the simulated async delay and
any optimistic update.

**Freshness is explicit.** Time-sensitive inventory (fares, rooms, calendar
prices) carries a `status` field (`available` / `expired` / `priceChanged` /
`soldOut` / `loading`) that the UI renders as a first-class state, never as a
silently stale price.

**Barcodes always have a text alternative.** `BookingTicketCard`'s
`BarcodeView` renders a human-readable confirmation code alongside (and, on
expiry, instead of) the graphic — a QR code is never the only way in.

## Tokens

`design-tokens/travel.tokens.json` — light and dark, semantic names only:
`surfaceSearch`/`Ticket`, `cheapest`/`bestValue`/`highDemand`, `priceUp`/`Down`,
`verified`, `ratingFill`, `guestFavorite`, `availableNow`/`limitedAvailability`/
`unavailable`/`soldOut`, `freeCancellation`/`partialRefund`/`nonRefundable`,
`status*` (Confirmed/Pending/Changed/Canceled/Expired), `freshness*`,
`focusRing`.

Read them with `useTravelTheme()`. No component in this folder accepts a hex
value.

## Usage

```tsx
import { SearchWidget, FlightResultCard, FareBreakdownAccordion } from '@ui/travel';

<SearchWidget
  locationOptions={airports}
  recentSearches={recentSearches}
  onSearch={(query) => runSearch(query)}   // caller owns validation and inventory
/>

<FlightResultCard offer={offer} onSelect={(item) => selectFlight(item)} />
```

See the running app's **Travel UI** tab for all thirteen, or read any
`*.usage.tsx` for the same examples in source form.
