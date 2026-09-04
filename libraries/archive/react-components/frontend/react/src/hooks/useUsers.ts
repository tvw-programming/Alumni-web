import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useCallback } from 'react';

import { queryKeys } from '@/api/queryKeys';
import { createUser, fetchUsers } from '@/services/userService';

import type { UserListFilters } from '@/types/user';

/**
 * queryOptions() keeps key + fn + cache config co-located and reusable
 * (useQuery, prefetchQuery, ensureQueryData all accept it).
 */
export function usersListOptions(filters: UserListFilters) {
  return queryOptions({
    queryKey: queryKeys.users.list(filters),
    queryFn: ({ signal }) => fetchUsers(filters, signal),
    placeholderData: keepPreviousData, // keep old list on screen while a new search loads
    staleTime: 60_000,
  });
}

export function useUsers(filters: UserListFilters) {
  return useQuery(usersListOptions(filters));
}

export function useInvalidateUsers() {
  const queryClient = useQueryClient();
  return useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.users.all }),
    [queryClient],
  );
}

export function useCreateUser() {
  return useMutation({
    mutationFn: createUser,
    // The Manage User form surfaces its own error snackbar; skip the global toast.
    meta: { silenceGlobalError: true },
  });
}
