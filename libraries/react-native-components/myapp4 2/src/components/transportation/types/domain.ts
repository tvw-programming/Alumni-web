import type { ImageAsset } from '@ui/primitives/media';
import type { Money } from '@ui/primitives/money';

/** Shared real-time signal for driver-matching and trip-tracking surfaces. */
export interface RealtimeMeta {
  lastUpdatedAt?: string;
  connection: 'connected' | 'reconnecting' | 'offline';
  source?: string;
}

export interface Coordinates {
  latitude: number;
  longitude: number;
}

// ---------------------------------------------------------------------------
// 1. LocationSearchSheet
// ---------------------------------------------------------------------------

export type LocationPointType = 'current' | 'recent' | 'saved' | 'searchResult' | 'landmark';

export interface LocationPoint {
  id?: string;
  label: string;
  address: string;
  coordinates?: Coordinates;
  type: LocationPointType;
  pickupInstructions?: string;
}

export type LocationSearchState = 'idle' | 'searching' | 'locationPermissionDenied' | 'noResults' | 'invalid' | 'confirmed' | 'error';

export type RideRequestMode = 'ride' | 'delivery' | 'package';

// ---------------------------------------------------------------------------
// 2. RideTypeSelector
// ---------------------------------------------------------------------------

export type RideAvailability = 'available' | 'limited' | 'unavailable';

export interface RideOption {
  id: string;
  name: string;
  description?: string;
  icon: string;
  capacity?: number;
  eta?: string;
  fare?: Money;
  fareLabel?: string;
  availability: RideAvailability;
  features?: string[];
  recommended?: boolean;
}

// ---------------------------------------------------------------------------
// 3. FareEstimateCard
// ---------------------------------------------------------------------------

export type FareLineKind = 'base' | 'tax' | 'fee' | 'discount' | 'toll' | 'surge';

export interface FareLine {
  id: string;
  label: string;
  amount: Money;
  kind: FareLineKind;
  explanation?: string;
}

export type FareEstimateStatus = 'estimated' | 'upfront' | 'calculating' | 'expired' | 'changed';

export interface FareEstimate {
  rideTypeId: string;
  amount?: Money;
  minAmount?: Money;
  maxAmount?: Money;
  status: FareEstimateStatus;
  includes?: string[];
  exclusions?: string[];
  validUntil?: string;
  breakdown?: FareLine[];
  previousAmount?: Money;
}

export type PaymentMethodKind = 'card' | 'cash' | 'wallet' | 'upi';

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
}

// ---------------------------------------------------------------------------
// 4. DriverCard
// ---------------------------------------------------------------------------

export type VerificationStatus = 'verified' | 'pending' | 'unknown';
export type PhoneContactAvailability = 'available' | 'masked' | 'unavailable';

export interface Vehicle {
  make?: string;
  model?: string;
  color?: string;
  plateNumber: string;
}

export interface Driver {
  id: string;
  name: string;
  avatar?: ImageAsset;
  rating?: number;
  ratingCount?: number;
  vehicle: Vehicle;
  verificationStatus?: VerificationStatus;
  phoneContact?: PhoneContactAvailability;
  eta?: string;
}

// ---------------------------------------------------------------------------
// 5. RideStatusBottomSheet
// ---------------------------------------------------------------------------

export type RideStatus =
  | 'searching'
  | 'driverAssigned'
  | 'driverArriving'
  | 'driverArrived'
  | 'inTrip'
  | 'arriving'
  | 'completed'
  | 'canceled'
  | 'failed'
  | 'reconnecting';

export interface RideStatusAction {
  key: string;
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface RideStatusModel extends RealtimeMeta {
  status: RideStatus;
  eta?: string;
  driver?: Driver;
  pickup?: LocationPoint;
  dropoff?: LocationPoint;
  actions?: RideStatusAction[];
}

// ---------------------------------------------------------------------------
// 6. MapMarkerCallout / RoutePolylineLegend
// ---------------------------------------------------------------------------

export type MapMarkerType = 'pickup' | 'dropoff' | 'driver' | 'user' | 'waypoint';

export interface MapMarker {
  id: string;
  type: MapMarkerType;
  coordinates: Coordinates;
  label: string;
  status?: string;
}

export type RouteMode = 'ride' | 'walking' | 'transfer';

export interface RouteSegment {
  id: string;
  coordinates: Coordinates[];
  mode?: RouteMode;
  label?: string;
  colorToken?: string;
}

// ---------------------------------------------------------------------------
// 7. OTPDisplayCard
// ---------------------------------------------------------------------------

export type OtpStatus = 'hidden' | 'active' | 'verified' | 'expired' | 'failed';

export interface OTPState {
  code: string;
  status: OtpStatus;
  expiresAt?: string;
  attemptsRemaining?: number;
}

// ---------------------------------------------------------------------------
// 8. SOSButton
// ---------------------------------------------------------------------------

export interface EmergencyContact {
  id: string;
  name: string;
  relation?: string;
}

export interface SafetyContext {
  tripId: string;
  active: boolean;
  emergencyNumber?: string;
  safetyTeamAvailable: boolean;
  emergencyContacts?: EmergencyContact[];
  location?: Coordinates;
}

export type SOSVariant = 'icon' | 'button' | 'menu';

// ---------------------------------------------------------------------------
// 9. TripSummaryCard
// ---------------------------------------------------------------------------

export type TripStatus = 'completed' | 'canceled' | 'refunded' | 'disputed';

export interface TripSummary {
  id: string;
  status: TripStatus;
  startedAt?: string;
  endedAt?: string;
  pickup: LocationPoint;
  dropoff: LocationPoint;
  distance?: string;
  duration?: string;
  rideType: string;
  driver?: Driver;
  fareLines: FareLine[];
  total: Money;
  paymentMethod?: PaymentMethod;
  receiptUrl?: string;
  tip?: Money;
}

// ---------------------------------------------------------------------------
// 10. SavedPlaceItem
// ---------------------------------------------------------------------------

export type SavedPlaceLabel = 'home' | 'work' | 'other' | 'airport' | 'custom';

export interface SavedPlace {
  id: string;
  label: SavedPlaceLabel;
  customLabel?: string;
  address: string;
  coordinates: Coordinates;
  isDefault?: boolean;
}

// ---------------------------------------------------------------------------
// 11. ScheduleRideSheet
// ---------------------------------------------------------------------------

export type ScheduledRideStatus = 'draft' | 'scheduled' | 'confirmed' | 'canceled' | 'unavailable';

export interface ScheduledRide {
  pickup?: LocationPoint;
  dropoff?: LocationPoint;
  scheduledAt?: string;
  timezone: string;
  rideTypeId?: string;
  schedulingFee?: Money;
  fare?: Money;
  flightNumber?: string;
  status: ScheduledRideStatus;
}

// ---------------------------------------------------------------------------
// 12. TipSelector
// ---------------------------------------------------------------------------

export type TipOptionType = 'preset' | 'custom' | 'none';

export interface TipOption {
  id: string;
  label: string;
  amount?: Money;
  percentage?: number;
  type: TipOptionType;
}

// ---------------------------------------------------------------------------
// 13. RideHistoryListItem
// ---------------------------------------------------------------------------

export type RideHistoryStatus = 'completed' | 'canceled' | 'refunded' | 'disputed' | 'pending';
export type TipStatus = 'notAvailable' | 'available' | 'added';

export interface RideHistoryItem {
  id: string;
  startedAt?: string;
  completedAt?: string;
  pickupLabel: string;
  dropoffLabel: string;
  rideType: string;
  status: RideHistoryStatus;
  total?: Money;
  driver?: Driver;
  receiptAvailable?: boolean;
  tipStatus?: TipStatus;
}
