import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppThemeProvider } from '@/theme';
import { ConfirmProvider, SheetProvider, ShimmerProvider, StatusBadgeProvider, ToastProvider } from '@ui';

import { SCREENSHOT_REGISTRY } from './registry.generated';
import { ScreenshotErrorBoundary } from './ScreenshotErrorBoundary';

/**
 * A second, deliberately minimal root component — mounted instead of the
 * real navigator when EXPO_PUBLIC_SCREENSHOT_HARNESS=1 (see index.ts). It
 * reads `?shot=<domain>-<Component>` from the URL, renders exactly that
 * component's own `*.usage.tsx` (the same example every domain's gallery
 * screen already renders live), and nothing else — no tab bar, no header
 * chrome — so the captured image is just the component.
 *
 * Providers mirror `AppProviders` minus `RootNavigator`; every usage file
 * already assumes this exact provider stack is present.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 0, refetchOnWindowFocus: false } },
});

const getShotKey = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('shot');
};

export default function HarnessApp() {
  const [shotKey] = useState(getShotKey);
  const Component = shotKey ? SCREENSHOT_REGISTRY[shotKey] : undefined;

  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppThemeProvider initialMode="light">
            <StatusBadgeProvider map={{}}>
              <ShimmerProvider>
                <ToastProvider>
                  <ConfirmProvider>
                    <SheetProvider>
                      {!shotKey ? (
                        <IndexList />
                      ) : !Component ? (
                        <View testID="screenshot-target" style={{ padding: 24 }}>
                          <Text>Unknown component key: {shotKey}</Text>
                        </View>
                      ) : (
                        <View testID="screenshot-target" nativeID="screenshot-target">
                          <ScreenshotErrorBoundary componentKey={shotKey}>
                            <Component />
                          </ScreenshotErrorBoundary>
                        </View>
                      )}
                    </SheetProvider>
                  </ConfirmProvider>
                </ToastProvider>
              </ShimmerProvider>
            </StatusBadgeProvider>
          </AppThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Human-friendly index when the harness is opened with no `?shot=` — lists every capturable key. */
const IndexList = () => {
  const keys = Object.keys(SCREENSHOT_REGISTRY);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return (
    <View style={{ padding: 24 }} testID="screenshot-harness-index">
      <Text variant="titleMedium">Screenshot harness — {keys.length} components{ready ? '' : ''}</Text>
      <Text variant="bodySmall" style={{ marginTop: 8 }}>
        Open with ?shot=domain-ComponentName, e.g. ?shot=agritech-ShipmentCard
      </Text>
    </View>
  );
};
