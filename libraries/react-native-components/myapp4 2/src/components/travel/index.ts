/**
 * TRAVEL, HOSPITALITY & BOOKING COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as the other domain libraries: nothing here imports from
 * `src/features`, `src/store` or `src/services`.
 *
 * The organising principle from the spec — decision transparency. Before a
 * traveler commits, they should be able to understand destination, dates,
 * occupancy, itinerary, inclusions, total cost, cancellation consequences and
 * booking status without opening several hidden screens:
 *
 *   - `SearchWidget` keeps query state and search execution separate — it only
 *     ever emits a normalized `SearchQuery`, never validates inventory itself
 *   - `FlightResultCard` puts stops and self-transfer warnings on the card,
 *     never behind a detail screen
 *   - `HotelCard` never shows "Free cancellation" without its deadline
 *   - `RoomTypeCard` never claims a room is available when only one rate plan is
 *   - `GuestRoomSelector` never silently adds a room to fix an occupancy problem
 *   - `FareBreakdownAccordion` never conceals a mandatory fee until after payment
 *   - `AmenityIconGrid` never lets a generic accessibility icon stand in for
 *     step-free entrance, an accessible bathroom, or elevator details
 *   - `ItineraryTimeline` always states the timezone next to a local time
 *   - `TravellerDetailsForm` never copies booker contact details silently —
 *     "same as booker" is an explicit, visible checkbox
 *   - `BookingTicketCard` always keeps the confirmation code legible even when
 *     the barcode can't render
 *   - `PriceCalendarStrip` calls predicted pricing a trend, never a guarantee
 *   - `CancellationPolicyCard` never says "Flexible cancellation" without a
 *     date and the refund consequence that makes it true
 *   - `ReviewSummaryCard` flags a low review-sample size instead of letting a
 *     thin average look as confident as a large one
 */

// Foundations
export * from './theme/travelTokens';
export * from './types';

// Components
export * from './SearchWidget';
export * from './FlightResultCard';
export * from './HotelCard';
export * from './RoomTypeCard';
export * from './GuestRoomSelector';
export * from './FareBreakdownAccordion';
export * from './AmenityIconGrid';
export * from './ItineraryTimeline';
export * from './TravellerDetailsForm';
export * from './BookingTicketCard';
export * from './PriceCalendarStrip';
export * from './CancellationPolicyCard';
export * from './ReviewSummaryCard';
