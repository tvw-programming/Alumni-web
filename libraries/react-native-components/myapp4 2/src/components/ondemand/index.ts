/**
 * ON-DEMAND SERVICE COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`.
 *
 * The organising principle from the spec — transparency at every commitment
 * point. Before a user confirms anything, they should be able to answer: what
 * am I booking, who will provide it, when will it happen, how much will it
 * cost, how do I reach them, and what does cancelling or something going
 * wrong actually mean:
 *
 *   - `ServiceCategoryTile` keeps unavailable categories visible with a
 *     reason instead of hiding them from the grid
 *   - `ServiceProviderCard` routes "Verified" to an explanation rather than
 *     letting the badge imply an unstated guarantee
 *   - `SlotBookingCalendar` always states the timezone and shows `held`
 *     slots rather than making counts look falsely generous
 *   - `AddOnServiceList` keeps disabled add-ons listed with a reason instead
 *     of removing them, and never hides a required line item
 *   - `PriceBreakdownSheet` makes every fee explainable on tap and never
 *     lets a status change silently move the total
 *   - `BookingSummaryCard` gives every fact (who/when/where/how much) its
 *     own labelled "Change" action and disables confirm while validating
 *   - `OrderStatusTimeline` replaces a stale ETA with an honest last-updated
 *     time instead of a countdown that has stopped meaning anything
 *   - `LiveTrackingCard` always pairs the map with a text sentence and drops
 *     all location detail the moment a trip ends
 *   - `AgentInfoCard` hides the handoff code until tapped and never lets a
 *     screen reader announce it automatically
 *   - `RatingFeedbackDialog` treats the star rating alone as a complete,
 *     submittable answer — tags and comments are optional refinements
 *   - `CancelReasonSheet` gives "Keep booking" the same visual weight as the
 *     exit and never cancels from a single accidental tap
 */

// Foundations
export * from './theme/ondemandTokens';
export * from './types';

// Components
export * from './ServiceCategoryTile';
export * from './ServiceProviderCard';
export * from './SlotBookingCalendar';
export * from './AddOnServiceList';
export * from './PriceBreakdownSheet';
export * from './BookingSummaryCard';
export * from './OrderStatusTimeline';
export * from './LiveTrackingCard';
export * from './AgentInfoCard';
export * from './RatingFeedbackDialog';
export * from './CancelReasonSheet';
