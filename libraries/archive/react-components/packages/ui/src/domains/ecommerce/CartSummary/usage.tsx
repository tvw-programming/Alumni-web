import { useQuery } from '@tanstack/react-query';

import { parseMoney } from '../../../foundation';

import { CartSummary, type CartTotals } from './CartSummary';
import sample from './sample.json';

export function CartSummaryUsage() {
  // Totals are read, never derived. `isFetching` (not `isLoading`) drives the
  // recalculating state, so a background refresh dims the figures instead of
  // blanking the panel.
  const cart = useQuery({
    queryKey: ['cart', 'totals'],
    queryFn: async (): Promise<CartTotals> => {
      const response = await fetch('/api/cart');
      const body = (await response.json()) as typeof sample;
      return {
        subtotal: parseMoney(body.totals.subtotal),
        discounts: parseMoney(body.totals.discounts),
        shipping: parseMoney(body.totals.shipping),
        tax: parseMoney(body.totals.tax),
        total: parseMoney(body.totals.total),
      };
    },
    initialData: {
      subtotal: parseMoney(sample.totals.subtotal),
      discounts: parseMoney(sample.totals.discounts),
      shipping: parseMoney(sample.totals.shipping),
      tax: parseMoney(sample.totals.tax),
      total: parseMoney(sample.totals.total),
    },
  });

  return (
    <CartSummary
      totals={cart.data}
      recalculating={cart.isFetching}
      itemCount={sample.itemCount}
      onCheckout={async () => {
        const response = await fetch('/api/checkout', { method: 'POST' });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
