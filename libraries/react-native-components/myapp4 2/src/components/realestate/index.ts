/**
 * REAL ESTATE & PROPTECH COMPONENT LIBRARY (React Native Paper)
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`. Built directly on React
 * Native Paper primitives per the spec's own component guide — `Card`,
 * `Chip`, `Checkbox`, `RadioButton`, `List.Item`/`List.Accordion`, `Menu`,
 * `SegmentedButtons`, `TextInput`, `Badge`, `Dialog`/`Portal` (via the
 * shared `AppSheet`) — plus `@react-native-community/slider` for the EMI
 * calculator's range inputs, since Paper has no slider primitive.
 *
 * The organising principle from the spec — trust through explicit evidence.
 * Users should understand a property's price, configuration, area, status,
 * location context, verification scope, financing estimate, visit
 * availability, and document state before a high-consequence decision:
 *
 *   - `PropertyCard` never hides a sold or unavailable listing — it stays
 *     visible with an honest status overlay
 *   - `PropertyStatusChip` uses the same muted grey for sold/rented as
 *     everything else, never an alarming red, and always pairs colour with
 *     an icon and a word
 *   - `PropertyFilterSheet` announces its live result count near Apply
 *   - `AmenityGrid` never uses a generic accessibility icon in place of a
 *     real accessibility description
 *   - `FloorPlanViewer` / `ImageGalleryGrid` never make room discovery
 *     depend on colour-coded polygons alone — every floor ships a text room list
 *   - `AgentContactCard` keeps Call and WhatsApp visually distinct and never
 *     renders a raw phone number
 *   - `EMICalculatorCard` never implies loan approval from an estimate, and
 *     every slider has a numeric text-input alternative
 *   - `LocalityInsightsCard` never makes a subjective "best locality" claim
 *     with no sourced, labelled metric behind it
 *   - `SiteVisitSchedulerSheet` keeps "pending confirmation" and "confirmed"
 *     as distinct, never conflated states
 *   - `ComparePropertiesTable` renders missing data as "Not provided," never
 *     "No" — absence of data is never proof of absence
 *   - `SavedSearchItem` / `PriceTrendChart` never frame a price trend as
 *     investment advice
 *   - `DocumentChecklistItem` never shows a verified checkmark for a file
 *     that has only been uploaded, not reviewed
 */

// Foundations
export * from './theme/realestateTokens';
export * from './types';

// Components
export * from './PropertyStatusChip';
export * from './PropertyCard';
export * from './PropertyFilterSheet';
export * from './AmenityGrid';
export * from './PropertyMedia';
export * from './AgentContactCard';
export * from './EMICalculatorCard';
export * from './LocalityInsightsCard';
export * from './SiteVisitSchedulerSheet';
export * from './ComparePropertiesTable';
export * from './SavedSearchAndTrend';
export * from './DocumentChecklistItem';
