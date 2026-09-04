import { useQueryClient } from '@tanstack/react-query';

import { newRequestId } from '../../../foundation';

import { AddToCartButton } from './AddToCartButton';
import sample from './sample.json';

export function AddToCartButtonUsage() {
  const queryClient = useQueryClient();

  return (
    <AddToCartButton
      quantity={sample.quantity}
      label={sample.label}
      fullWidth={sample.fullWidth}
      onAddToCart={async (quantity) => {
        const response = await fetch('/api/cart/items', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // A retried add must not create a second line. The server keys on
            // this and replays its first answer.
            'Idempotency-Key': newRequestId(),
          },
          body: JSON.stringify({ productId: 'prd_7f3a91', quantity }),
        });
        if (!response.ok) throw await response.json();
        await queryClient.invalidateQueries({ queryKey: ['cart'] });
      }}
    />
  );
}
