import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/services/api';
import type { Order } from '@/services/types';

export const orderKeys = {
  all: ['orders'] as const,
  list: (status: string) => [...orderKeys.all, 'list', status] as const,
};

export const useOrders = (status: string) =>
  useQuery({ queryKey: orderKeys.list(status), queryFn: () => api.listOrders(status) });

/** Optimistic cancel: the row disappears immediately and rolls back on failure. */
export const useCancelOrder = (status: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.cancelOrder(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: orderKeys.list(status) });
      const previous = queryClient.getQueryData<Order[]>(orderKeys.list(status));
      queryClient.setQueryData<Order[]>(orderKeys.list(status), (old: Order[] | undefined) =>
        (old ?? []).filter((order: Order) => order.id !== id),
      );
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(orderKeys.list(status), context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: orderKeys.all }),
  });
};
