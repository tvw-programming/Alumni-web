# Transportation & Ride-Hailing Component Library

Domain layer for the request → match → complete ride journey: location
search, ride-type and fare selection, live driver matching and tracking,
pickup verification, safety, trip history, and scheduled rides. Built **on
top of** the base library in `src/components/` — it composes `AppCard`,
`AppButton`, `AppSheet`, the promoted `MoneyRow`, and the Toast/Sheet
providers rather than duplicating them.

## Folder structure

```
src/components/transportation/
├── theme/transportationTokens.ts   # surfaceSearch/Map, status*, marker*, otp*, safety*, focusRing
├── types/domain.ts                 # LocationPoint, RideOption, FareEstimate, Driver,
│                                    # RideStatusModel, MapMarker, OTPState, TripSummary, …
│
├── LocationSearchSheet/
├── RideTypeSelector/
├── FareEstimateCard/               # built on the shared MoneyRow
├── DriverCard/                     # reused inside RideStatusBottomSheet and TripSummaryCard
├── RideStatusBottomSheet/
├── MapMarkerCallout/                # covers both MapMarkerCallout and RoutePolylineLegend
├── OTPDisplayCard/
├── SOSButton/
├── TripSummaryCard/                 # built on DriverCard + MoneyRow
├── SavedPlaceItem/
├── ScheduleRideSheet/                # built on the shared MoneyRow
├── TipSelector/
└── RideHistoryListItem/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **Rides UI** tab renders
them directly, so an example that drifts from its component fails the
typecheck.

## Reused from the base and other domains

- **`Money` / `formatMoney`** (`@ui/primitives/money`) — the same
  minor-units model every other domain uses for fares, fees, tips, and
  scheduling charges.
- **`ImageAsset`** (`@ui/primitives/media`) — driver avatars share the exact
  shape ServiceProviderCard and DoctorCard already read.
- **`MoneyRow`** (`@ui/molecules/MoneyRow`) — reused as-is by
  `FareEstimateCard`, `TripSummaryCard`, and `ScheduleRideSheet` for every
  fare/fee/tip line.
- **`AppSheet`** (`@ui/organisms`) — backs `LocationSearchSheet`,
  `RideStatusBottomSheet`, `SOSButton`'s Safety Centre, and
  `ScheduleRideSheet`, the same primitive every prior domain's bottom sheets
  and dialogs use.
- **`DriverCard`** is composed inside both `RideStatusBottomSheet` (live
  trip) and `TripSummaryCard` (completed trip) — one implementation, two
  call sites, so driver presentation never drifts between the two.

## The one rule

> Operational clarity. At every point, riders should understand where pickup
> is, what vehicle they selected, how much the ride should cost, who is
> arriving, what state the trip is in, how to contact support, and what
> safety action is available.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `LocationSearchSheet` | Depend on the map for address selection — textual search, recents, and saved places stay usable even if the map provider fails. |
| `RideTypeSelector` | Hide price behind ETA or vice versa — both render together, and an unavailable ride type stays listed with a reason. |
| `FareEstimateCard` | Call an estimate final while route, tolls, waiting time, or demand can still move it — a `changed` status always shows the old and new amount together. |
| `DriverCard` | Surface a raw phone number. Contact routes through a masked relay by convention, and the plate is never the only vehicle confirmation. |
| `RideStatusBottomSheet` | Infer status from a marker moving on a map — it renders a formal `RideStatus` value from the trip service. |
| `MapMarkerCallout` | Make marker or route understanding dependent on colour, or leave the map as the only way to inspect or adjust a point. |
| `OTPDisplayCard` | Auto-reveal or auto-announce the pickup code. It stays hidden until an explicit tap. |
| `SOSButton` | Place an emergency call from a single accidental tap — a confirmation step states exactly what will happen first. |
| `TripSummaryCard` | Let receipt, dispute, or lost-item actions drift from the trip they were opened for — every action carries the exact trip id. |
| `SavedPlaceItem` | Delete a saved place on a single tap — removal always confirms in place first. |
| `ScheduleRideSheet` | Imply a guaranteed vehicle. It states outright that driver assignment isn't guaranteed until closer to pickup. |
| `TipSelector` | Make "No tip" visually smaller or less prominent than the preset amounts. |
| `RideHistoryListItem` | Communicate status through a coloured route line alone — every status pairs an icon with a word. |

## Cross-cutting standards

**Never colour alone.** Ride-type availability, marker types, OTP status, and
ride-history status all pair an icon and a text label with any colour.

**Optimistic UI stays in the screen, not the component.** Every presentational
component here only emits intent (`onSelect`, `onConfirm`, `onSOS`-style
callbacks); the accompanying `*.usage.tsx` owns any simulated async delay.

**Safety is a surface, not a widget.** `SOSButton` opens a full Safety Centre
sheet with emergency help, trip sharing, incident reporting, and support all
reachable from one place — never a single isolated icon with no context.

**Privacy by construction.** `DriverCard` and `RideStatusBottomSheet` never
render a raw phone number; `OTPDisplayCard` never writes to the clipboard
itself (that's the host screen's job via `onCopy`); `LocationSearchSheet`
only ever hands an address to its own `onPickupChange`/`onDropoffChange`.

## Tokens

`design-tokens/transportation.tokens.json` — light and dark, semantic names
only: `surfaceSearch`/`Map`/`Selected`, `status*` (Searching/Assigned/
Arriving/Arrived/InTrip/Completed/Canceled/Failed/Reconnecting),
`availableNow`/`limitedAvailability`/`unavailable`, `verified`, `ratingFill`,
`otpSurface`/`onOtpSurface`/`otpBorder`, `safety`/`safetyContainer`,
`marker*` (Pickup/Dropoff/Driver/User), `focusRing`.

Read them with `useRideTheme()`. No component in this folder accepts a hex
value.

## Usage

```tsx
import { LocationSearchSheet, RideTypeSelector, FareEstimateCard } from '@ui/transportation';

<RideTypeSelector
  options={rideOptions}
  selectedId={selectedId}
  onSelect={(option) => setSelectedId(option.id)}   // caller owns matching and fare calculation
/>

<FareEstimateCard estimate={estimate} onRequest={() => requestRide(estimate)} />
```

See the running app's **Rides UI** tab for all thirteen, or read any
`*.usage.tsx` for the same examples in source form.
