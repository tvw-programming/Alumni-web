/**
 * Domain models shared by every commerce component.
 *
 * One file, because the alternative — each component declaring its own `Money`
 * — is how a cart ends up adding a number in paise to a number in rupees. These
 * types are the contract between the UI and whatever serves it.
 *
 * Two rules run through all of them:
 *
 * 1. **Money is minor units plus a currency, never a float.** 0.1 + 0.2 is not
 *    0.3 in IEEE-754, and a rounding difference in a total is a support ticket.
 * 2. **Availability is a union, never a boolean.** `inStock: false` cannot
 *    distinguish "sold out" from "we have not checked your pincode yet", and
 *    those need different words on screen.
 */

/** Minor units: 149900 with currency INR is ₹1,499.00. */
export interface Money {
  readonly amountMinor: number;
  readonly currency: string;
}

export type Availability = 'available' | 'lowStock' | 'outOfStock' | 'unknown';

/**
 * Every async surface in the library reports one of these. Listed in the brief
 * as a cross-component standard; keeping the union here is what stops each
 * component inventing `isLoading` plus `hasError` plus `isEmpty` and rendering
 * two of them at once.
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

export interface ImageAsset {
  readonly src: string;
  /** Required, not optional: an empty alt on a product image is a bug, and a
   *  type that allows it invites one. Use '' only for decorative images. */
  readonly alt: string;
  readonly width?: number;
  readonly height?: number;
  readonly thumbnail?: string;
}

export interface Discount {
  readonly type: 'percentage' | 'amount';
  readonly value: number;
  readonly label: string;
  /** Automatic discounts are already in the selling price; conditional ones are
   *  not, and telling a customer they saved money they have not yet saved is
   *  the kind of error that reaches a regulator. */
  readonly applied: 'automatic' | 'conditional' | 'coupon' | 'cashback';
}

export interface Rating {
  readonly average: number;
  readonly count: number;
  readonly max?: number;
}

export interface DeliveryPromise {
  readonly label: string;
  /** False when no pincode has been supplied. The card must then say "Check
   *  delivery" rather than showing yesterday's estimate for someone else. */
  readonly checkedForLocation: boolean;
  readonly etaMinutes?: number;
  readonly fee?: Money;
}

export type BadgeTone = 'neutral' | 'promo' | 'trust' | 'warning' | 'sponsored';

export interface Badge {
  readonly id: string;
  readonly label: string;
  readonly tone: BadgeTone;
}

export interface ProductVariant {
  readonly id: string;
  readonly label: string;
  readonly swatchColor?: string;
  readonly swatchImage?: string;
  readonly availability: Availability;
}

export interface ProductCardData {
  readonly id: string;
  readonly title: string;
  readonly brand?: string;
  readonly image: ImageAsset;
  readonly price?: PriceModel;
  readonly rating?: Rating;
  readonly deliveryPromise?: DeliveryPromise;
  readonly badges?: readonly Badge[];
  readonly availability: Availability;
  readonly variants?: readonly ProductVariant[];
  readonly href?: string;
}

export interface PriceModel {
  readonly sellingPrice: Money;
  /** MRP / list price. Absent when there is no reference price — which is not
   *  the same as it being equal to the selling price. */
  readonly compareAtPrice?: Money;
  readonly discount?: Discount;
  /** "Member price", "With coupon SAVE10" — shown next to the number so a
   *  conditional price is never mistaken for the payable one. */
  readonly qualifiers?: readonly string[];
  readonly unitPrice?: Money;
  readonly unitLabel?: string;
  readonly taxMode?: 'included' | 'excluded' | 'unknown';
}

export interface QuantityConfig {
  readonly value: number;
  readonly min: number;
  readonly max?: number;
  readonly step: number;
  readonly unit?: string;
  /** Why the stepper will not go further — "Only 3 available", "Maximum 5 per
   *  customer". A disabled control with no explanation is the complaint the
   *  brief singles out. */
  readonly disabledReason?: string;
  readonly updateState?: 'idle' | 'loading' | 'error';
}

export type AddToCartState =
  | 'idle'
  | 'loading'
  | 'added'
  | 'chooseOptions'
  | 'outOfStock'
  | 'error'
  | 'disabled';
