import { useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { api } from '@/services/api';
import type { Page, Product } from '@/services/types';

export const productKeys = {
  all: ['products'] as const,
  list: (search: string, categories: string[]) => [...productKeys.all, 'list', search, categories] as const,
  detail: (id: string) => [...productKeys.all, 'detail', id] as const,
};

/**
 * All pagination concerns live here — the screen receives a flat array and
 * three booleans. That is the whole contract.
 */
export const useProducts = (search: string, categories: string[]) => {
  const query = useInfiniteQuery({
    queryKey: productKeys.list(search, categories),
    queryFn: ({ pageParam }) => api.listProducts({ search, categories, cursor: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: Page<Product>) => lastPage.nextCursor ?? undefined,
    staleTime: 30_000,
  });

  return {
    products: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    refetch: query.refetch,
    isRefetching: query.isRefetching,
    error: query.error,
  };
};

export const useProduct = (id: string) =>
  useQuery({ queryKey: productKeys.detail(id), queryFn: () => api.getProduct(id) });
