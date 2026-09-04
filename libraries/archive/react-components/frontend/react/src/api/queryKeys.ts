import type { ProductListFilters } from '@/types/product';
import type { UserListFilters } from '@/types/user';

/**
 * Single source of truth for query keys. Keys embed their input attributes so
 * TanStack Query refetches automatically when filters change and invalidation
 * can target any level of the hierarchy.
 */
export const queryKeys = {
  apiScenarios: {
    all: ['api-scenarios'] as const,
    product: (id: number) => [...queryKeys.apiScenarios.all, 'product', id] as const,
    user: (id: number) => [...queryKeys.apiScenarios.all, 'user', id] as const,
    todo: (id: number) => [...queryKeys.apiScenarios.all, 'todo', id] as const,
    post: (id: number) => [...queryKeys.apiScenarios.all, 'post', id] as const,
    category: (category: string) => [...queryKeys.apiScenarios.all, 'category', category] as const,
    scheduled: ['api-scenarios', 'scheduled'] as const,
  },
  users: {
    all: ['users'] as const,
    list: (filters: UserListFilters) => [...queryKeys.users.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.users.all, 'detail', id] as const,
  },
  products: {
    all: ['products'] as const,
    list: (filters: ProductListFilters) => [...queryKeys.products.all, 'list', filters] as const,
    detail: (id: number) => [...queryKeys.products.all, 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
  },
  items: {
    all: ['items'] as const,
  },
  /** Build-time Vitest artifact read by the admin console's Unit tests tab. */
  testReport: ['test-report'] as const,
} as const;
