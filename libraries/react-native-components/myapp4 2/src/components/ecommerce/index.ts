/**
 * E-COMMERCE COMPONENT LIBRARY
 *
 * Domain layer on top of the base library in `src/components/`. Same
 * portability rule as fintech: nothing here imports from `src/features`,
 * `src/store` or `src/services`.
 *
 * The architectural rule from the spec — keep UI separate from pricing rules,
 * inventory truth, delivery capacity, tax, serviceability, cart mutation,
 * review moderation and order orchestration — is enforced by construction:
 *
 *   - `PriceTag` never computes a discount percentage (the pricing service does)
 *   - `QuantityStepper` never owns inventory (`max`/`disabledReason` are passed in)
 *   - `AddToCartButton` never infers success from a tap (`state` comes from the server)
 *   - `CartSummaryCard` never hides a mandatory fee behind a disclosure
 *   - `VariantSelector` never silently reassigns an invalid selection
 *   - `FilterSortSheet` never builds a query (the search layer does)
 *   - `CouponInput` never decides eligibility (validation is server-authoritative)
 *   - `AddressPicker` never requires a map provider for manual entry
 *   - `OrderTrackerTimeline` never shows a countdown on a delayed order
 */

// Foundations
export * from './theme/ecommerceTokens';
export * from './types';

// Components
export * from './ProductCard';
export * from './PriceTag';
export * from './QuantityStepper';
export * from './AddToCartButton';
export * from './Cart';
export * from './ImageCarousel';
export * from './VariantSelector';
export * from './FilterSortSheet';
export * from './Reviews';
export * from './AddressPicker';
export * from './CouponInput';
export * from './Fulfillment';
