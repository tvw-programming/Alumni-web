# AgriTech & Logistics / Supply Chain Component Library (React Native Paper)

Domain layer for two connected field domains: crop and farm advisory (crop
stage, weather, mandi prices, soil health, alerts, field maps, input
ordering) and logistics execution (shipments, routes, vehicle tracking,
inventory, warehouses, proof of delivery, barcode scanning). Built directly
on **React Native Paper** primitives per the spec's own component guide —
`Card`, `Surface`, `List.Item`, `Chip`, `Badge`, `Button`, `IconButton`,
`Switch`, `Checkbox`, `RadioButton.Group`, `ProgressBar`,
`ActivityIndicator`, `Dialog`/`Portal` (via the shared `AppSheet`), `Menu`,
`TextInput`, `Divider` — layered on top of the base library in
`src/components/`.

## Folder structure

```
src/components/agritech/
├── theme/agritechTokens.ts   # stageOnTrack/Overdue, priceUp/Down, nutrient*, severity*, shipment*, stock*, tracking*
├── types/domain.ts           # Crop, WeatherDay, MandiPrice, SoilReport, AdvisoryAlert, Shipment, RouteStop, …
│
├── CropCard/
├── WeatherForecastStrip/
├── MandiPriceListItem/
├── SoilHealthCard/
├── AdvisoryAlertBanner/
├── FieldMapCard/
├── InputOrderCard/
├── ShipmentCard/
├── ShipmentStatusTimeline/
├── VehicleTrackingCard/
├── InventoryStockRow/
├── WarehouseSelector/
├── PODCaptureSheet/
├── BarcodeScannerOverlay/
└── RouteStopListItem/
```

Every folder follows the same three-file shape:
**`Component.tsx`** · **`Component.sample.json`** (dummy data) ·
**`Component.usage.tsx`** (a real, compiling example).

The usage files are not documentation-only — the **AgriTech UI** tab
renders them directly, so an example that drifts from its component fails
the typecheck.

## Reused from the base and other domains

- **`Money`** / `formatMoney` (`@ui/primitives/money`) — `MandiPriceListItem`
  and `InputOrderCard` use the same shape and formatter as every other
  domain's pricing.
- **`ImageAsset`** (`@ui/primitives/media`) — `CropCard`, `InputOrderCard`,
  and `VehicleTrackingCard`'s driver avatar share the same image-with-text-
  alternative shape as every other domain.
- **`AppCard`** / **`AppButton`** (`@ui/molecules`, `@ui/atoms`) — every
  card and primary action across the domain.
- **`AppSheet`** (`@ui/organisms`) — the same Portal-based primitive every
  other domain's dialogs and sheets use, backing `PODCaptureSheet`.
- `BarcodeScannerOverlay`'s manual-entry fallback and `PODCaptureSheet`'s
  offline-save path follow the same "always give a way back" shape as
  `DevicePairingWizard` in the IoT domain.

## The one rule

> Operational truth in difficult conditions. Farmers and field operators
> should always know what data is current, what action is recommended,
> what shipment state is verified, what evidence has been captured, and
> what the system will do when connectivity, inventory, GPS, scanning, or
> device hardware fails.

Enforced by construction:

| Component | What it deliberately cannot do |
|---|---|
| `CropCard` | Present a system-inferred crop stage as farmer-confirmed truth — `stageStatus` keeps the two visibly distinct. |
| `WeatherForecastStrip` | Let a weather icon alone signal rain, heat, wind, or storm risk, or show a stale forecast as current without saying so. |
| `MandiPriceListItem` | Rely on delta colour alone — an arrow icon and an "Up"/"Down"/"Stable" word always come with it, and a stale price says so in text. |
| `SoilHealthCard` | Imply a progress bar's midpoint is universally optimal — the status word always comes from the report, and interpretation stays disclaimed and crop-specific. |
| `AdvisoryAlertBanner` | Generate or infer its own pesticide, chemical, or agronomic guidance — severity, message, and action all come from a validated advisory engine, rendered as-is. |
| `FieldMapCard` | Make the map preview the only way to know a field's area or crop — a text summary always sits alongside it, and a missing boundary is its own visible state. |
| `InputOrderCard` | Crowd dosage, safety, or regulatory detail onto the ordering card — that detail stays on the product detail surface. |
| `ShipmentCard` / `ShipmentStatusTimeline` | Infer "delivered" from a single scan, or assume a fixed four-step lifecycle — every carrier status maps to a shared semantic state, and scan history is preserved exactly as it happened. |
| `VehicleTrackingCard` | Expose a raw driver phone number, or make the map the only ETA source — calls route through a relay, and a text route/ETA alternative always backs the map. |
| `InventoryStockRow` | Colour an item low-stock without also showing quantity and reorder point — "available," "reserved," and "sellable" stay distinguished. |
| `WarehouseSelector` | Silently switch a warehouse when route or inventory constraints change — selection stays fully controlled by the caller. |
| `PODCaptureSheet` | Mark a delivery complete locally before every required proof is captured and the server accepts it — a failed upload stays visible as "Saved for later." |
| `BarcodeScannerOverlay` | Decide whether a scan is valid — it only passes the result to shipment/stop validation, and a manual code path always sits next to the camera. |
| `RouteStopListItem` | Fold "Navigate," "Start stop," or "Add proof" into a swipe-only gesture — each is a real, glove-sized button, and a list fallback always exists even when a map route is available. |

## Cross-cutting standards

**Never colour alone.** Crop stage, price delta, nutrient status, advisory
severity, shipment state, stock health, and tracking freshness all pair an
icon or text label with any colour.

**Domain components stay thin.** Crop-stage advisory, weather/mandi
integrations, soil interpretation, geospatial mapping, inventory/order
management, shipment normalization, driver location tracking, barcode
validation, POD evidence storage, route optimization, and offline sync all
live in services outside this folder — every component here only ever
emits an intent via a callback prop. Every `*.usage.tsx` owns the simulated
async delay, optimistic update, and rollback/error simulation that stands
in for these services.

**Built for field conditions.** Large touch targets, text alternatives
next to every map or icon-only signal, and explicit offline/stale states
throughout — `PODCaptureSheet` and `BarcodeScannerOverlay` both keep a
manual fallback next to their camera-driven happy path.

## Tokens

`design-tokens/agritech.tokens.json` — light and dark, semantic names only:
`background`/`surface`/`surfaceVariant`, `stageOnTrack`/`Overdue`/
`Inferred`, `priceUp`/`Down`/`Flat`, `nutrientLow`/`Optimal`/`High`,
`severityInfo`/`Watch`/`Warning`/`Urgent`, `shipmentPending`/`InTransit`/
`OutForDelivery`/`Delivered`/`Exception`, `stockHealthy`/`Low`/`Out`,
`trackingLive`/`Stale`/`Offline`.

Read them with `useAgriLogisticsTheme()`. No component in this folder
accepts a hex value.

## Usage

```tsx
import { CropCard, ShipmentCard, RouteStopListItem } from '@ui/agritech';

<ShipmentCard
  shipment={shipment}
  onPress={(s) => openShipmentDetail(s.id)}
  onContactSupport={(s) => openSupport(s.id)}
/>
```

See the running app's **AgriTech UI** tab for all fifteen, or read any
`*.usage.tsx` for the same examples in source form.
