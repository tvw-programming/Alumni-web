import type { ImageAsset, Rating } from '@ui/primitives/media';
import type { Money } from '@ui/primitives/money';

/** Shared freshness signal for time-sensitive inventory (fares, rooms, prices). */
export interface Freshness {
  lastUpdatedAt?: string;
  expiresAt?: string;
  status: 'fresh' | 'stale' | 'expired';
}

// ---------------------------------------------------------------------------
// 1. SearchWidget
// ---------------------------------------------------------------------------

export type TripMode = 'flight' | 'hotel' | 'package' | 'activity';
export type TripType = 'oneWay' | 'roundTrip' | 'multiCity';

export interface TravelLocation {
  id: string;
  code?: string;
  city: string;
  name: string;
  country?: string;
  isNearby?: boolean;
}

export interface TravelerGroup {
  adults: number;
  children: number;
  infants?: number;
}

export interface SearchQuery {
  mode: TripMode;
  tripType?: TripType;
  origin?: TravelLocation;
  destination?: TravelLocation;
  departureDate?: string;
  returnDate?: string;
  travelers: TravelerGroup;
  rooms?: number;
  flexibleDates?: boolean;
}

export interface RecentSearch {
  id: string;
  query: SearchQuery;
  searchedAt: string;
  summaryLabel: string;
}

// ---------------------------------------------------------------------------
// 2. FlightResultCard
// ---------------------------------------------------------------------------

export interface AirportTime {
  airportCode: string;
  airportName?: string;
  city?: string;
  time: string;
  nextDay?: boolean;
}

export interface FlightSegment {
  carrier: string;
  carrierName?: string;
  flightNumber?: string;
  departure: AirportTime;
  arrival: AirportTime;
  duration: string;
  aircraft?: string;
  layoverAfter?: { duration: string; airportCode: string; airportChange?: boolean; selfTransfer?: boolean };
}

export interface BaggageAllowance {
  cabin?: string;
  checked?: string;
  included: boolean;
}

export type FlightOfferStatus = 'available' | 'expired' | 'priceChanged' | 'soldOut' | 'searching';

export interface FlightOffer {
  id: string;
  segments: FlightSegment[];
  stops: number;
  totalDuration: string;
  price: Money;
  pricePerTraveler?: Money;
  fareType?: string;
  baggage?: BaggageAllowance;
  refundability?: 'refundable' | 'partiallyRefundable' | 'nonRefundable';
  status: FlightOfferStatus;
  badge?: 'best' | 'cheapest' | 'fastest';
  connectionTooShort?: boolean;
  scheduleChanged?: boolean;
}

// ---------------------------------------------------------------------------
// 3. HotelCard
// ---------------------------------------------------------------------------

export type AmenityAvailability = 'included' | 'paid' | 'unavailable' | 'unknown';
export type AmenityScope = 'property' | 'room' | 'transport';

export interface Amenity {
  id: string;
  label: string;
  icon: string;
  availability?: AmenityAvailability;
  scope?: AmenityScope;
  description?: string;
}

export interface CancellationSummary {
  type: 'free' | 'partialRefund' | 'nonRefundable' | 'custom';
  deadline?: string;
  timezone: string;
  summary: string;
}

export type HotelAvailability = 'available' | 'limited' | 'soldOut' | 'unknown';

export interface HotelCardData {
  id: string;
  name: string;
  images: ImageAsset[];
  location: string;
  rating?: Rating;
  propertyType?: string;
  starRating?: number;
  amenities?: Amenity[];
  price?: Money;
  totalPrice?: Money;
  nights?: number;
  cancellation?: CancellationSummary;
  availability: HotelAvailability;
  guestFavorite?: boolean;
  favorited?: boolean;
}

// ---------------------------------------------------------------------------
// 4. RoomTypeCard
// ---------------------------------------------------------------------------

export interface Inclusion {
  id: string;
  label: string;
  icon?: string;
}

export type PaymentTiming = 'now' | 'later' | 'atProperty';
export type RoomAvailability = 'available' | 'limited' | 'unavailable';

export interface RoomRate {
  id: string;
  roomName: string;
  images?: ImageAsset[];
  beds?: string;
  maxGuests: number;
  size?: string;
  inclusions: Inclusion[];
  cancellation: CancellationSummary;
  paymentTiming?: PaymentTiming;
  price: Money;
  availability: RoomAvailability;
}

// ---------------------------------------------------------------------------
// 5. GuestRoomSelector
// ---------------------------------------------------------------------------

export interface GuestRoomSelection {
  adults: number;
  children: number;
  childAges?: (number | null)[];
  rooms: number;
  infants?: number;
  pets?: number;
}

export interface OccupancyRules {
  minAdults: number;
  maxAdults: number;
  maxChildren: number;
  maxRooms: number;
  maxGuestsPerRoom?: number;
  requireChildAges: boolean;
}

// ---------------------------------------------------------------------------
// 6. FareBreakdownAccordion
// ---------------------------------------------------------------------------

export type FareLineKind = 'base' | 'tax' | 'fee' | 'discount' | 'addOn' | 'deposit' | 'credit';

export interface FareLine {
  id: string;
  label: string;
  amount: Money;
  kind: FareLineKind;
  explanation?: string;
  optional?: boolean;
}

export type FareBreakdownStatus = 'estimated' | 'calculating' | 'final' | 'changed';

export interface FareBreakdown {
  lines: FareLine[];
  total: Money;
  status: FareBreakdownStatus;
  paymentTiming?: PaymentTiming;
  changedNote?: string;
}

// ---------------------------------------------------------------------------
// 8. ItineraryTimeline
// ---------------------------------------------------------------------------

export type ItineraryEventType = 'flight' | 'hotel' | 'activity' | 'transfer' | 'car' | 'meal';
export type ItineraryEventStatus = 'confirmed' | 'pending' | 'changed' | 'canceled';

export interface ItineraryAction {
  key: string;
  label: string;
  onPress: () => void;
}

export interface ItineraryEvent {
  id: string;
  startAt: string;
  endAt?: string;
  timezone: string;
  timezoneLabel?: string;
  type: ItineraryEventType;
  title: string;
  location?: string;
  provider?: string;
  confirmationCode?: string;
  status: ItineraryEventStatus;
  alert?: string;
  actions?: ItineraryAction[];
}

// ---------------------------------------------------------------------------
// 9. TravellerDetailsForm
// ---------------------------------------------------------------------------

export type TravellerType = 'adult' | 'child' | 'infant';

export interface PassportDetails {
  number?: string;
  nationality?: string;
  expiryDate?: string;
}

export interface ContactDetails {
  email?: string;
  phone?: string;
}

export interface AssistanceRequest {
  id: string;
  label: string;
}

export interface Traveller {
  id: string;
  type: TravellerType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  passport?: PassportDetails;
  contact?: ContactDetails;
  assistance?: AssistanceRequest[];
}

export interface TravellerFieldError {
  field: string;
  message: string;
}

// ---------------------------------------------------------------------------
// 10. BookingTicketCard
// ---------------------------------------------------------------------------

export type TicketType = 'flight' | 'train' | 'bus' | 'event' | 'hotel';
export type TicketStatus = 'confirmed' | 'changed' | 'canceled' | 'expired';
export type BarcodeFormat = 'qr' | 'pdf417' | 'code128';

export interface TicketBarcode {
  value: string;
  format: BarcodeFormat;
  expiresAt?: string;
}

export interface TicketDetail {
  id: string;
  label: string;
  value: string;
}

export interface BookingTicket {
  id: string;
  type: TicketType;
  status: TicketStatus;
  provider: string;
  travelerName?: string;
  origin?: string;
  destination?: string;
  startAt: string;
  confirmationCode: string;
  barcode?: TicketBarcode;
  details: TicketDetail[];
}

// ---------------------------------------------------------------------------
// 11. PriceCalendarStrip
// ---------------------------------------------------------------------------

export type CalendarPriceStatus = 'available' | 'unavailable' | 'loading' | 'unknown';
export type CalendarPriceLabel = 'cheapest' | 'bestValue' | 'highDemand';

export interface CalendarPrice {
  date: string;
  price?: Money;
  status: CalendarPriceStatus;
  label?: CalendarPriceLabel;
  trend?: 'up' | 'down' | 'stable';
}

// ---------------------------------------------------------------------------
// 12. CancellationPolicyCard
// ---------------------------------------------------------------------------

export interface RefundRule {
  id: string;
  fromLabel: string;
  refundPercent: number;
  note?: string;
}

export interface CancellationPolicy {
  type: 'free' | 'partialRefund' | 'nonRefundable' | 'custom';
  deadline?: string;
  timezone: string;
  refundRules: RefundRule[];
  summary: string;
  details?: string;
}

// ---------------------------------------------------------------------------
// 13. ReviewSummaryCard
// ---------------------------------------------------------------------------

export interface ReviewCategoryScore {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  reviewCount?: number;
}

export interface ReviewHighlight {
  id: string;
  text: string;
  sentiment: 'positive' | 'negative';
}

export interface ReviewSummary {
  overallScore: number;
  maxScore: number;
  reviewCount: number;
  categories: ReviewCategoryScore[];
  highlights?: ReviewHighlight[];
  verified?: boolean;
  recentReviewDate?: string;
}
