/**
 * AGRITECH & LOGISTICS / SUPPLY CHAIN COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper primitives per the spec's own component guide — `Card`,
 * `Surface`, `List.Item`, `Chip`, `Badge`, `Button`, `IconButton`, `Switch`,
 * `Checkbox`, `RadioButton.Group`, `ProgressBar`, `ActivityIndicator`,
 * `Dialog`/`Portal` (via the shared `AppSheet`), `Menu`, `TextInput`,
 * `Divider` — with custom map, scanner, and signature adapters rather than
 * forcing those into Paper primitives.
 *
 * The organising principle from the spec — operational truth in difficult
 * conditions. Farmers and field operators should always know what data is
 * current, what action is recommended, what shipment state is verified,
 * what evidence has been captured, and what the system will do when
 * connectivity, inventory, GPS, scanning, or device hardware fails:
 *
 *   - `CropCard` never presents a system-inferred stage as farmer-confirmed
 *     truth — `stageStatus` keeps the two visibly distinct
 *   - `WeatherForecastStrip` never lets a weather icon alone signal rain,
 *     heat, wind, or storm risk, and a stale forecast says so in text
 *   - `MandiPriceListItem` never relies on delta colour alone — an arrow
 *     icon and an "Up"/"Down"/"Stable" word always come with it
 *   - `SoilHealthCard` never implies a progress bar's midpoint is
 *     universally optimal — interpretation stays disclaimed and crop-specific
 *   - `AdvisoryAlertBanner` never generates its own agronomic guidance —
 *     severity, message, and action all come from a validated advisory engine
 *   - `FieldMapCard` never makes the map preview the only way to know a
 *     field's area or crop — a text summary always sits alongside it
 *   - `InputOrderCard` keeps dosage, safety, and regulatory detail on the
 *     product detail surface, never crowded onto the ordering card
 *   - `ShipmentCard` / `ShipmentStatusTimeline` map every carrier-specific
 *     status to a shared semantic state and never infer "delivered" from
 *     a single scan
 *   - `VehicleTrackingCard` never exposes a raw driver phone number — calls
 *     route through a relay, and a text ETA always backs the map preview
 *   - `InventoryStockRow` never colours an item low-stock without showing
 *     quantity and reorder point alongside it
 *   - `WarehouseSelector` never silently switches a warehouse when route or
 *     inventory constraints change — selection stays fully controlled
 *   - `PODCaptureSheet` never marks a delivery complete locally until every
 *     required proof is captured and the server accepts it
 *   - `BarcodeScannerOverlay` never decides whether a scan is valid — it
 *     only passes the result to shipment/stop validation, and a manual
 *     code path always sits next to the camera
 *   - `RouteStopListItem` never folds "Navigate," "Start stop," or "Add
 *     proof" into a swipe-only gesture — each is a real, glove-sized button
 *
 * Crop-stage advisory, weather/mandi integrations, soil interpretation,
 * geospatial mapping, inventory/order management, shipment normalization,
 * driver location tracking, barcode validation, POD evidence storage,
 * route optimization, and offline sync all live in domain services outside
 * this folder — every component here only ever emits an intent via a
 * callback prop.
 */

// Foundations
export * from './theme/agritechTokens';
export * from './types';

// Components
export * from './CropCard';
export * from './WeatherForecastStrip';
export * from './MandiPriceListItem';
export * from './SoilHealthCard';
export * from './AdvisoryAlertBanner';
export * from './FieldMapCard';
export * from './InputOrderCard';
export * from './ShipmentCard';
export * from './ShipmentStatusTimeline';
export * from './VehicleTrackingCard';
export * from './InventoryStockRow';
export * from './WarehouseSelector';
export * from './PODCaptureSheet';
export * from './BarcodeScannerOverlay';
export * from './RouteStopListItem';
