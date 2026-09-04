import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';

import { snackbar } from '@/components/snackbar/snackbarBus';
import { isAppError } from '@/types/api';
import { getUserMessage } from '@/utils/errors';

export function shouldRetryRequest(failureCount: number, error: unknown): boolean {
  if (isAppError(error)) {
    // 4xx, auth, cancellation and validation errors will not succeed on retry.
    if (error.kind === 'api' && error.status < 500) return false;
    if (error.kind === 'auth' || error.kind === 'canceled' || error.kind === 'validation')
      return false;
  }
  return failureCount < 2;
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      // Initial-load errors render inline via QueryGate; only background
      // refetch failures (stale data on screen) surface as a toast.
      if (query.state.data !== undefined) {
        snackbar.error(getUserMessage(error));
      }
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      if (mutation.meta?.silenceGlobalError === true) return;
      snackbar.error(getUserMessage(error));
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: shouldRetryRequest,
      retryDelay: (attemptIndex) => Math.min(1_000 * 2 ** attemptIndex, 30_000),
    },
    mutations: {
      retry: 0,
    },
  },
});
