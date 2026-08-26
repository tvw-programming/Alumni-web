import { useMutation, useQueryClient } from '@tanstack/react-query';

import { asId, parseMoney, type CartItemId } from '../../../foundation';

import { CartLineItem, type CartItem } from './CartLineItem';
import sample from './sample.json';

export function CartLineItemUsage() {
  const queryClient = useQueryClient();

  const item: CartItem = {
    id: asId<CartItemId>(sample.item.id),
    title: sample.item.title,
    imageUri: sample.item.imageUri,
    variantLabel: sample.item.variantLabel,
    unitPrice: parseMoney(sample.item.unitPrice),
    maxQuantity: sample.item.maxQuantity,
  };

  const update = useMutation({
    mutationFn: async (quantity: number) => {
      const response = await fetch(`/api/cart/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw await response.json();
    },
    // The server recalculates the whole cart, so the totals come from it — the
    // optimistic quantity is a *row* prediction, never a total.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
  });

  return (
    <CartLineItem
      item={item}
      quantity={sample.quantity}
      updateState={update.isPending ? 'updating' : update.isError ? 'error' : 'idle'}
      errorMessage={update.error instanceof Error ? update.error.message : undefined}
      onQuantityChange={(quantity) => update.mutateAsync(quantity)}
      onRemove={() => update.mutateAsync(0)}
    />
  );
}
