import {
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/api/queryKeys';
import {
  fetchScenarioPost,
  fetchScenarioProduct,
  fetchScenarioProductPage,
  fetchScenarioProductsByCategory,
  fetchScenarioTodo,
  fetchScenarioUser,
} from '@/services/apiScenarioService';

import type { Product } from '@/types/product';

export function scenarioProductOptions(id: number) {
  return queryOptions({
    queryKey: queryKeys.apiScenarios.product(id),
    queryFn: ({ signal }) => fetchScenarioProduct(id, signal),
    staleTime: 60_000,
  });
}

export function usePlainProductRequest() {
  return useMutation({
    mutationFn: (id: number) => fetchScenarioProduct(id),
    meta: { silenceGlobalError: true },
  });
}

export function useDelayedProductRequest(delayMs = 1_200) {
  return useMutation({
    mutationFn: (id: number) => fetchScenarioProduct(id, undefined, delayMs),
    meta: { silenceGlobalError: true },
  });
}

export function useRetryProductRequest() {
  return useQuery({
    ...scenarioProductOptions(2),
    enabled: false,
    retry: 2,
    retryDelay: (attempt) => Math.min(500 * 2 ** attempt, 2_000),
  });
}

export function useParallelApiScenario(enabled: boolean) {
  return useQueries({
    queries: [
      {
        queryKey: queryKeys.apiScenarios.product(3),
        queryFn: ({ signal }) => fetchScenarioProduct(3, signal),
        staleTime: 60_000,
        enabled,
      },
      {
        queryKey: queryKeys.apiScenarios.user(3),
        queryFn: ({ signal }) => fetchScenarioUser(3, signal),
        enabled,
      },
      {
        queryKey: queryKeys.apiScenarios.todo(3),
        queryFn: ({ signal }) => fetchScenarioTodo(3, signal),
        enabled,
      },
    ],
  });
}

export function useSequentialApiScenario() {
  return useMutation({
    mutationFn: async () => {
      const product = await fetchScenarioProduct(4);
      const user = await fetchScenarioUser(4);
      const todo = await fetchScenarioTodo(4);
      return { product, user, todo };
    },
  });
}

export function useDependentApiScenario(enabled: boolean) {
  const productQuery = useQuery({ ...scenarioProductOptions(5), enabled });
  const category = productQuery.data?.category;
  const categoryQuery = useQuery({
    queryKey: queryKeys.apiScenarios.category(category ?? 'pending'),
    queryFn: ({ signal }) => fetchScenarioProductsByCategory(category ?? '', signal),
    enabled: enabled && category !== undefined,
  });
  return { productQuery, categoryQuery };
}

export function useScheduledApiScenario(enabled: boolean, intervalMs = 10_000) {
  return useQuery({
    queryKey: queryKeys.apiScenarios.scheduled,
    queryFn: ({ signal }) => fetchScenarioProduct(6, signal),
    enabled,
    refetchInterval: intervalMs,
    refetchIntervalInBackground: true,
    retry: false,
  });
}

export function useProductPage(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...queryKeys.apiScenarios.all, 'page', page, pageSize],
    queryFn: ({ signal }) => fetchScenarioProductPage(page, pageSize, signal),
  });
}

export function useCancelablePost(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.apiScenarios.post(7),
    queryFn: ({ signal }) => fetchScenarioPost(7, signal, 3_000),
    enabled,
  });
}

export function useCancelScenarioPost() {
  const client = useQueryClient();
  return useCallback(
    () => client.cancelQueries({ queryKey: queryKeys.apiScenarios.post(7) }),
    [client],
  );
}

export function usePrefetchScenarioProduct() {
  const client = useQueryClient();
  return useCallback((id: number) => client.prefetchQuery(scenarioProductOptions(id)), [client]);
}

export interface OptimisticProductTitleInput {
  id: number;
  title: string;
}

/** Cache-only optimistic demo; production mutations should persist through a service first. */
export function useOptimisticProductTitle() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: OptimisticProductTitleInput) => {
      await Promise.resolve();
      return input;
    },
    onMutate: async (input) => {
      const key = queryKeys.apiScenarios.product(input.id);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<Product>(key);
      client.setQueryData<Product>(key, (current) =>
        current ? { ...current, title: input.title } : current,
      );
      return { key, previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) client.setQueryData(context.key, context.previous);
    },
    onSettled: async (_data, _error, input) => {
      await client.invalidateQueries({ queryKey: queryKeys.apiScenarios.product(input.id) });
    },
  });
}
