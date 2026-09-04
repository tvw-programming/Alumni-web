/**
 * Commerce component library — public surface.
 *
 * Import from here rather than from a component's own path, so a folder can be
 * reorganised without touching consumers.
 */

// Domain models and formatting. Every component speaks these types.
export * from './_core/commerce.types';
export * from './_core/money';

export { PriceTag } from './price-tag/price-tag';
export type { PriceSize, PriceLayout } from './price-tag/price-tag';

export { QuantityStepper } from './quantity-stepper/quantity-stepper';
export type { StepperSize } from './quantity-stepper/quantity-stepper';

export { AddToCartButton } from './add-to-cart-button/add-to-cart-button';
export type { AddToCartVariant } from './add-to-cart-button/add-to-cart-button';

export { ProductCard } from './product-card/product-card';
export type { ProductCardLayout } from './product-card/product-card';
