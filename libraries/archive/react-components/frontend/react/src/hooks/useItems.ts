import { useQuery } from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { fetchItems } from '@/services/itemService';

/** Backs the Teams page accordion — see components/ItemsAccordion.tsx. */
export function useItems() {
  return useQuery({
    queryKey: queryKeys.items.all,
    queryFn: ({ signal }) => fetchItems(signal),
    staleTime: 30_000,
  });
}
