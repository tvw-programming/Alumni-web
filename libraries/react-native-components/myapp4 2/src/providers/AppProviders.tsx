import React, { useMemo } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { ConfirmProvider, SheetProvider, ShimmerProvider, StatusBadgeProvider, ToastProvider } from '@ui';
import { AppThemeProvider } from '@/theme';

/**
 * Provider order matters:
 *   Gesture → SafeArea → Query → Theme (mounts Portal.Host) → UI providers.
 * Toast/Sheet/Confirm must sit *inside* the Portal host so they render above
 * navigation, and inside the theme so they can read tokens.
 */

/** Domain statuses mapped to semantic intents — the app's one place for this. */
const STATUS_MAP = {
  // Orders
  pending: 'warning',
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  failed: 'error',
  refunded: 'neutral',
  // Inventory
  in_stock: 'success',
  out_of_stock: 'error',
  // Account
  verified: 'success',
  unverified: 'warning',
} as const;

export const AppProviders = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 },
        },
      }),
    [],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider>
            <StatusBadgeProvider map={STATUS_MAP}>
              <ShimmerProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <SheetProvider>{children}</SheetProvider>
                  </ConfirmProvider>
                </ToastProvider>
              </ShimmerProvider>
            </StatusBadgeProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};
