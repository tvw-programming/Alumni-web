/**
 * TRANSPORTATION & RIDE-HAILING COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`.
 *
 * The organising principle from the spec — operational clarity. At every
 * point, riders should understand where pickup is, what vehicle they
 * selected, how much the ride should cost, who is arriving, what state the
 * trip is in, how to contact support, and what safety action is available:
 *
 *   - `LocationSearchSheet` keeps textual address selection available even
 *     when map services fail, and never exposes an exact address to anything
 *     but its own callbacks
 *   - `RideTypeSelector` always shows price and ETA together — neither is
 *     hidden behind a second interaction — and keeps unavailable ride types
 *     visible with a reason
 *   - `FareEstimateCard` never labels an estimate as final when route, tolls,
 *     waiting time or demand can still change it
 *   - `DriverCard` never surfaces a raw phone number; contact routes through
 *     a masked relay by convention
 *   - `RideStatusBottomSheet` renders status from a real trip-service value,
 *     never inferred from a marker moving on a map
 *   - `MapMarkerCallout` always pairs the map with a full text-list
 *     alternative — pickup adjustment is reachable by list, never map-only
 *   - `OTPDisplayCard` hides the pickup code until an explicit reveal tap and
 *     never auto-announces it
 *   - `SOSButton` puts a real confirmation step, stating what will happen,
 *     between any tap and an actual emergency call
 *   - `TripSummaryCard` binds every action (receipt, dispute, lost item) to
 *     the exact trip id it belongs to
 *   - `SavedPlaceItem` never deletes on a single tap — removal always confirms
 *   - `ScheduleRideSheet` states outright whether scheduling guarantees a
 *     vehicle or only creates an advance request
 *   - `TipSelector` gives "No tip" the same visual weight as every preset
 *   - `RideHistoryListItem` carries status by icon and word, never colour alone
 */

// Foundations
export * from './theme/transportationTokens';
export * from './types';

// Components
export * from './LocationSearchSheet';
export * from './RideTypeSelector';
export * from './FareEstimateCard';
export * from './DriverCard';
export * from './RideStatusBottomSheet';
export * from './MapMarkerCallout';
export * from './OTPDisplayCard';
export * from './SOSButton';
export * from './TripSummaryCard';
export * from './SavedPlaceItem';
export * from './ScheduleRideSheet';
export * from './TipSelector';
export * from './RideHistoryListItem';
