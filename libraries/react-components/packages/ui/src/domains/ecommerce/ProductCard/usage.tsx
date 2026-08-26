import { useQueryClient } from '@tanstack/react-query';

import { asId, parseMoney, type ProductId } from '../../../foundation';

import { ProductCard, type ProductSummary } from './ProductCard';
import sample from './sample.json';

/**
 * Turning the wire shape into the component's props.
 *
 * `sample.json` holds money as `{ amountMinor: "899500", currency: "INR" }`
 * because JSON has no `bigint`. `parseMoney` is the only way in, so no
 * component ever receives a float it might round.
 *
 * Not exported: a module that exports both a component and a helper opts out of
 * fast refresh, and every usage file in this library is a component module.
 */
function toProductSummary(raw: typeof sample.product): ProductSummary {
  return {
    id: asId<ProductId>(raw.id),
    title: raw.title,
    imageUri: raw.imageUri,
    brand: raw.brand,
    price: parseMoney(raw.price),
    compareAtPrice: parseMoney(raw.compareAtPrice),
    rating: raw.rating,
    reviewCount: raw.reviewCount,
    availability: raw.availability as ProductSummary['availability'],
    badges: raw.badges,
  };
}

export function ProductCardUsage() {
  const queryClient = useQueryClient();
  const product = toProductSummary(sample.product);

  return (
    <ProductCard
      product={product}
      variant="grid"
      saved={false}
      onPress={() => {
        // navigate(`/products/${product.id}`)
      }}
      // Resolves when the server confirms. React returns the heart to the
      // authoritative value by itself if this rejects.
      onToggleSaved={async (next) => {
        await fetch(`/api/wishlist/${product.id}`, { method: next ? 'PUT' : 'DELETE' });
        await queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      }}
      // Throwing here is what surfaces the message under the button; the button
      // must not report success from the click alone.
      onAddToCart={async () => {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product.id, quantity: 1 }),
        });
        if (!response.ok) throw await response.json();
        await queryClient.invalidateQueries({ queryKey: ['cart'] });
      }}
    />
  );
}
