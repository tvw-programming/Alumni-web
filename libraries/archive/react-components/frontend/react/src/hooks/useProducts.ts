import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import { queryKeys } from '@/api/queryKeys';
import { createProduct, fetchProducts } from '@/services/productService';

import type { ProductListFilters } from '@/types/product';

export function productsListOptions(filters: ProductListFilters) {
  return queryOptions({
    queryKey: queryKeys.products.list(filters),
    queryFn: ({ signal }) => fetchProducts(filters, signal),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useProducts(filters: ProductListFilters) {
  return useQuery(productsListOptions(filters));
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    // The form renders its own submit-level error; skip the global toast.
    meta: { silenceGlobalError: true },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
    },
  });
}
