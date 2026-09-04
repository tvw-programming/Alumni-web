import type { Money } from '@ui/primitives/money';
import type { ImageAsset, MediaAsset, Rating } from '@ui/primitives/media';

export type { ImageAsset, MediaAsset, Rating };

/**
 * Commerce domain models.
 *
 * The library-wide async vocabulary from the spec lives here as `AsyncState`,
 * and availability is a first-class union rather than a boolean — "in stock"
 * versus "3 left" versus "we don't know yet" are genuinely different UIs.
 */

export type AsyncState =
  | 'idle'
  | 'loading'
  | 'refreshing'
  | 'success'
  | 'empty'
  | 'partial'
  | 'unavailable'
  | 'error'
  | 'offline'
  | 'stale';

export type Availability = 'available' | 'lowStock' | 'outOfStock' | 'unknown';

export interface Discount {
  type: 'percentage' | 'amount';
  value: number;
  label: string;
  /** Automatic discounts are already in the price; conditional ones are not. */
  conditional?: boolean;
}

export interface DeliveryPromise {
  /** "Tomorrow", "In 12 minutes", "Sat, 23 Aug". */
  label: string;
  speed?: 'instant' | 'fast' | 'standard' | 'delayed';
  /** False until the promise has been checked against the user's address. */
  locationChecked?: boolean;
  fee?: Money;
}

export interface Badge {
  key: string;
  label: string;
  tone?: 'promo' | 'neutral' | 'sponsored' | 'assured';
}

export interface PriceModel {
  sellingPrice: Money;
  /** MRP / list price. Omit when there is no reference price. */
  compareAtPrice?: Money;
  discount?: Discount;
  /** "With coupon SAVE10", "Prime price", "Bank offer applied". */
  qualifiers?: string[];
  /** e.g. ₹50 per kg. */
  unitPrice?: Money;
  unitLabel?: string;
  taxMode?: 'included' | 'excluded' | 'unknown';
  /** For variant products: "From ₹1,299". */
  isFromPrice?: boolean;
}

export interface VariantOption {
  id: string;
  label: string;
  swatch?: { color?: string; image?: string };
  availability: Availability;
  disabledReason?: string;
  /** Variant-specific price delta, resolved by the caller. */
  priceLabel?: string;
}

export interface VariantGroup {
  id: string;
  label: string;
  type: 'size' | 'color' | 'pack' | 'material' | 'seller' | 'flavor';
  options: VariantOption[];
  required: boolean;
  /** Renders a "Size guide" affordance next to the heading. */
  helpLabel?: string;
}

export interface ProductCardData {
  id: string;
  title: string;
  brand?: string;
  image: ImageAsset;
  price?: PriceModel;
  rating?: Rating;
  deliveryPromise?: DeliveryPromise;
  badges?: Badge[];
  availability: Availability;
  /** Small swatch preview shown on the card itself. */
  variantPreview?: VariantOption[];
  sponsored?: boolean;
  /** "Because you viewed running shoes". */
  personalizationLabel?: string;
  minOrderQuantity?: number;
  ageRestricted?: boolean;
  sellerCount?: number;
}

export type AddToCartState =
  | 'idle'
  | 'loading'
  | 'added'
  | 'chooseOptions'
  | 'outOfStock'
  | 'error'
  | 'disabled';

export interface QuantityConfig {
  value: number;
  min: number;
  max?: number;
  step: number;
  /** "kg", "pack", "item". */
  unit?: string;
  disabledReason?: string;
  updateState?: 'idle' | 'loading' | 'error';
}

export interface FulfillmentInfo {
  sellerName?: string;
  deliveryLabel?: string;
  shipmentId?: string;
}

export interface CartItemAction {
  key: string;
  label: string;
  icon?: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface CartLine {
  id: string;
  productId: string;
  variantId?: string;
  title: string;
  brand?: string;
  image: ImageAsset;
  variantSummary?: string;
  quantity: QuantityConfig;
  unitPrice: Money;
  compareAtUnitPrice?: Money;
  lineTotal: Money;
  availability: 'available' | 'limited' | 'outOfStock' | 'substitutionRequired';
  fulfillment?: FulfillmentInfo;
  actions?: CartItemAction[];
  /** Grocery: what the shopper will bring instead. */
  substitution?: { title: string; accepted: boolean };
  savedForLater?: boolean;
}

export interface CartTotals {
  subtotal: Money;
  discounts?: Money;
  shipping?: Money;
  serviceFee?: Money;
  tax?: Money;
  tip?: Money;
  credits?: Money;
  total: Money;
  savings?: Money;
  /** Explains an estimated (not final) tax or fee. */
  estimatedNote?: string;
}

export interface GalleryAsset {
  id: string;
  type: 'image' | 'video' | 'spin';
  src: string;
  thumbnail?: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface FacetOption {
  id: string;
  label: string;
  count?: number;
  swatch?: { color?: string; image?: string };
  disabled?: boolean;
}

export interface Facet {
  id: string;
  label: string;
  type: 'checkbox' | 'radio' | 'range' | 'searchableList' | 'swatch';
  options?: FacetOption[];
  min?: number;
  max?: number;
  unitLabel?: string;
}

export interface RangeValue {
  min: number;
  max: number;
}

export interface FilterState {
  values: Record<string, string[] | RangeValue>;
  sort?: string;
}

export interface Review {
  id: string;
  rating: number;
  title?: string;
  body: string;
  authorLabel: string;
  verified: boolean;
  createdAt: string;
  media?: MediaAsset[];
  /** "Size: 9 UK", "Colour: Black". */
  variantContext?: Record<string, string>;
  helpfulCount?: number;
  moderationStatus: 'published' | 'pending' | 'removed';
  merchantResponse?: { body: string; createdAt: string };
  /** Only when user-provided; never inferred. */
  fitFeedback?: 'small' | 'trueToSize' | 'large';
  translatedFrom?: string;
}

export interface RatingBreakdownData {
  average: number;
  totalCount: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
}

export interface Address {
  id: string;
  label?: 'home' | 'work' | 'other';
  recipientName: string;
  lines: string[];
  city?: string;
  region?: string;
  postalCode?: string;
  country: string;
  phone?: string;
  instructions?: string;
  serviceability: 'available' | 'unavailable' | 'checking' | 'unknown';
  serviceabilityNote?: string;
  isDefault?: boolean;
}

export type CouponState = 'idle' | 'validating' | 'applied' | 'invalid' | 'expired' | 'ineligible' | 'error';

export interface CouponResult {
  code: string;
  state: CouponState;
  discount?: Money;
  message?: string;
  restrictions?: string[];
  /** Discount depends on something the user has not done yet. */
  conditional?: boolean;
}

export interface OfferListing {
  code: string;
  title: string;
  description: string;
  expiresAt?: string;
  minOrder?: Money;
  eligible: boolean;
  ineligibleReason?: string;
  autoApplied?: boolean;
}

export interface DeliverySlot {
  id: string;
  /** ISO date. */
  date: string;
  startTime: string;
  endTime: string;
  fee?: Money;
  type: 'instant' | 'scheduled' | 'pickup';
  availability: 'available' | 'full' | 'expired' | 'checking';
  label?: string;
  recommended?: boolean;
}

export type FulfillmentStatus =
  | 'placed'
  | 'confirmed'
  | 'preparing'
  | 'shopping'
  | 'packed'
  | 'pickedUp'
  | 'outForDelivery'
  | 'delivered'
  | 'delayed'
  | 'failed'
  | 'canceled';

export interface FulfillmentEvent {
  id: string;
  status: FulfillmentStatus;
  label: string;
  timestamp?: string;
  description?: string;
  completed: boolean;
  current: boolean;
  /** Replacement approvals, failed delivery reasons, etc. */
  action?: { label: string; onPress: () => void };
}
