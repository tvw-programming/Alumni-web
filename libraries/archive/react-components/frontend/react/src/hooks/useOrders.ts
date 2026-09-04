import { useMutation, useQueryClient } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { createOrder } from '@/services/orderService';

/**
 * Mirrors `useCreateProduct` in `useProducts.ts`: the mutation owns
 * loading/error/retry state and cache invalidation, while the form owns
 * field-level validation and UX. See `OrderForm.tsx` for how the two compose.
 */
export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createOrder,
    // The form renders its own submit-level error; skip the global toast.
    meta: { silenceGlobalError: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}
