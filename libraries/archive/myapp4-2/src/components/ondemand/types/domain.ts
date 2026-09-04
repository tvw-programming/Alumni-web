import type { Money } from '@ui/primitives/money';
import type { ImageAsset, Rating } from '@ui/primitives/media';

export type { Money, ImageAsset, Rating };

/**
 * Delivery and home-service domain models.
 *
 * The spec's closing principle drives these types: at every commitment point a
 * user should know what they're booking, who provides it, when, at what price,
 * how to reach the provider, and what cancellation means — so booking status,
 * tracking freshness and cancellation cost are all explicit fields, never left
 * for the UI to infer.
 */

/** Library-wide async vocabulary, extended with real-time concerns. */
export type ServiceAsyncState =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'optimistic'
  | 'success'
  | 'empty'
  | 'error'
  | 'offline'
  | 'stale'
  | 'unavailable'
  | 'requiresConfirmation';

export interface RealtimeMeta {
  lastUpdatedAt?: string;
  syncStatus?: 'live' | 'stale' | 'ended' | 'unavailable';
  source?: string;
  confidence?: 'high' | 'medium' | 'low';
}

export type CategoryTileState = 'default' | 'selected' | 'disabled' | 'loading';

export interface ServiceCategory {
  id: string;
  label: string;
  description?: string;
  icon: string;
  badge?: string;
  count?: number;
  state?: CategoryTileState;
  /** "Not available in your area" — shown instead of hiding the tile. */
  unavailableReason?: string;
  isNew?: boolean;
  isRecent?: boolean;
}

export type ProviderAvailability = 'available' | 'limited' | 'unavailable';
export type PriceUnit = 'flat' | 'hour' | 'visit' | 'from';

export interface ServiceProvider {
  id: string;
  name: string;
  avatar?: ImageAsset;
  serviceLabel: string;
  rating?: Rating;
  distanceLabel?: string;
  price?: Money;
  priceUnit?: PriceUnit;
  verified?: boolean;
  /** What the verification actually covers — never a bare badge. */
  verificationScope?: string;
  nextAvailableLabel?: string;
  availability: ProviderAvailability;
  favorited?: boolean;
  requestOnly?: boolean;
  profileIncomplete?: boolean;
}

export interface Address {
  id: string;
  label?: string;
  lines: string[];
  city?: string;
  instructions?: string;
}

export interface AddOn {
  id: string;
  label: string;
  description?: string;
  price: Money;
  unitLabel?: string;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  maxQuantity?: number;
  quantity?: number;
  recommended?: boolean;
  required?: boolean;
}

export type BookingStatus = 'draft' | 'validating' | 'ready' | 'submitted' | 'confirmed' | 'error';

export interface ServiceSummary {
  id: string;
  title: string;
  categoryLabel?: string;
}

export interface ProviderSummary {
  id: string;
  name: string;
  avatar?: ImageAsset;
}

export interface TimeSlotRef {
  id: string;
  startsAt: string;
  endsAt: string;
  timezoneLabel?: string;
}

export interface BookingSummary {
  service: ServiceSummary;
  provider?: ProviderSummary;
  slot?: TimeSlotRef;
  location?: Address;
  duration?: string;
  addOns?: AddOn[];
  subtotal: Money;
  fees?: Money;
  tax?: Money;
  discount?: Money;
  total: Money;
  status: BookingStatus;
  /** Shown when the price moved since the user last looked. */
  priceChangedNote?: string;
}

export type SlotStatus = 'available' | 'held' | 'booked' | 'expired';

export interface TimeSlot {
  id: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  status: SlotStatus;
  price?: Money;
  premium?: boolean;
}

export interface CalendarDate {
  date: string;
  availableCount: number;
  isToday?: boolean;
}

export type OrderStepStatus = 'upcoming' | 'current' | 'complete' | 'delayed' | 'failed' | 'canceled';

export interface OrderStatusStep {
  id: string;
  label: string;
  description?: string;
  timestamp?: string;
  status: OrderStepStatus;
  actionLabel?: string;
  onAction?: () => void;
}

export type TrackingStatus = 'pending' | 'live' | 'stale' | 'ended' | 'unavailable';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface LiveTrackingData extends RealtimeMeta {
  provider?: ProviderSummary;
  origin?: Coordinates;
  destination?: Coordinates;
  providerLocation?: Coordinates;
  etaLabel?: string;
  distanceLabel?: string;
  trackingStatus: TrackingStatus;
  canCall?: boolean;
  canChat?: boolean;
  routeChangedNote?: string;
}

export type OtpCodeStatus = 'notShown' | 'active' | 'used' | 'expired';

export interface Agent {
  id: string;
  name: string;
  avatar?: ImageAsset;
  roleLabel: string;
  rating?: Rating;
  vehicleLabel?: string;
  verified?: boolean;
  verificationScope?: string;
  assignmentStatus: 'assigned' | 'enRoute' | 'arrived' | 'changed' | 'unavailable';
}

export type CancelReasonKind = 'noFee' | 'feeApplicable';

export interface CancelReason {
  id: string;
  label: string;
  kind?: CancelReasonKind;
  requiresNote?: boolean;
}

export type PriceLineType = 'base' | 'fee' | 'tax' | 'discount' | 'credit' | 'tip' | 'deposit';

export interface PriceLine {
  id: string;
  label: string;
  amount: Money;
  type: PriceLineType;
  expandable?: boolean;
  explanation?: string;
}

export type PriceBreakdownStatus = 'estimated' | 'calculating' | 'final' | 'changed';

export interface PriceBreakdown {
  lines: PriceLine[];
  total: Money;
  status: PriceBreakdownStatus;
  changedNote?: string;
  cancellationFeeNote?: string;
}

export interface FeedbackTag {
  id: string;
  label: string;
}

export interface RatingSubject {
  id: string;
  name: string;
  type: 'provider' | 'delivery' | 'service' | 'product';
}

export interface Feedback {
  subjectId: string;
  rating: number;
  tagIds: string[];
  comment?: string;
  isPrivate?: boolean;
  photoUris?: string[];
}
