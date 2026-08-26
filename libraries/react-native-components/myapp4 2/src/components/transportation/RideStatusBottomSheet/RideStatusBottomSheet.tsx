import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { RideStatus, RideStatusModel } from '../types/domain';
import { DriverCard } from '../DriverCard/DriverCard';

const STATUS_COPY: Record<RideStatus, { headline: string; icon: string; colorKey: keyof ReturnType<typeof useRideTheme>['colors'] }> = {
  searching: { headline: 'Finding your driver', icon: 'magnify', colorKey: 'statusSearching' },
  driverAssigned: { headline: 'Driver assigned', icon: 'account-check-outline', colorKey: 'statusAssigned' },
  driverArriving: { headline: 'Your driver is on the way', icon: 'car-clock', colorKey: 'statusArriving' },
  driverArrived: { headline: 'Your driver has arrived', icon: 'map-marker-check', colorKey: 'statusArrived' },
  inTrip: { headline: "You're on your way", icon: 'car-side', colorKey: 'statusInTrip' },
  arriving: { headline: "You've arrived", icon: 'flag-checkered', colorKey: 'statusArrivingDestination' },
  completed: { headline: 'Trip complete', icon: 'check-circle', colorKey: 'statusCompleted' },
  canceled: { headline: 'Ride canceled', icon: 'cancel', colorKey: 'statusCanceled' },
  failed: { headline: 'No drivers found. Try again.', icon: 'alert-circle-outline', colorKey: 'statusFailed' },
  reconnecting: { headline: 'Reconnecting…', icon: 'wifi-alert', colorKey: 'statusReconnecting' },
};

export interface RideStatusBottomSheetProps extends StyleEscapeHatches {
  visible: boolean;
  onDismiss: () => void;
  model: RideStatusModel;
  onCall?: () => void;
  onChat?: () => void;
  onShare?: () => void;
  onSafety?: () => void;
  onCancel?: () => void;
  onSupport?: () => void;
}

/**
 * Status is a real state machine value from the trip service, never inferred
 * from a marker moving on a map. Safety and trip-sharing stay reachable from
 * every active-ride state, and a stale connection is announced honestly
 * rather than freezing the last known status silently.
 */
export const RideStatusBottomSheet = ({
  visible,
  onDismiss,
  model,
  onCall,
  onChat,
  onShare,
  onSafety,
  onCancel,
  onSupport,
  style,
  containerStyle,
  testID,
}: RideStatusBottomSheetProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'ride-status-bottom-sheet';
  const copy = STATUS_COPY[model.status];
  const active = !['completed', 'canceled', 'failed'].includes(model.status);
  const dismissible = !active || model.status === 'failed';

  return (
    <AppSheet
      visible={visible}
      onDismiss={dismissible ? onDismiss : () => {}}
      variant="bottom"
      dismissible={dismissible}
      scrollable
      testID={id}
      footer={
        model.status === 'failed' && onCancel ? (
          <AppButton variant="primary" size="lg" fullWidth onPress={onCancel} testID={childTestID(id, 'try-again')}>
            Try again
          </AppButton>
        ) : active && onCancel ? (
          <AppButton variant="ghost" size="md" fullWidth onPress={onCancel} testID={childTestID(id, 'cancel')}>
            Cancel ride
          </AppButton>
        ) : undefined
      }
    >
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <View style={styles.headerRow}>
          <Icon source={copy.icon} size={22} color={ride.colors[copy.colorKey]} />
          <View style={{ marginLeft: theme.spacing.sm, flex: 1 }}>
            <Text variant="titleMedium" accessibilityLiveRegion="polite">
              {copy.headline}
            </Text>
            {model.eta ? (
              <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {model.status === 'arriving' ? `Arriving in ${model.eta}` : `${model.eta} away`}
              </Text>
            ) : null}
          </View>
        </View>

        {model.connection === 'reconnecting' ? (
          <Notice icon="wifi-alert" text="Reconnecting to live trip updates…" tone="warn" />
        ) : model.connection === 'offline' ? (
          <Notice icon="wifi-off" text={`You're offline. Showing last known status${model.lastUpdatedAt ? ` from ${model.lastUpdatedAt}` : ''}.`} tone="warn" />
        ) : null}

        {(model.pickup || model.dropoff) && (
          <View style={{ gap: 4 }}>
            {model.pickup ? (
              <RouteRow icon="circle-outline" label={model.pickup.label} />
            ) : null}
            {model.dropoff ? <RouteRow icon="map-marker" label={model.dropoff.label} /> : null}
          </View>
        )}

        {model.driver ? (
          <DriverCard
            driver={model.driver}
            showSafetyAction={active}
            onCall={onCall}
            onChat={onChat}
            onShare={active ? onShare : undefined}
            onSafety={active ? onSafety : undefined}
          />
        ) : null}

        {model.actions && model.actions.length > 0 ? (
          <View style={{ gap: theme.spacing.xs }}>
            {model.actions.map((action) => (
              <TouchableRipple
                key={action.key}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                testID={childTestID(id, action.key)}
              >
                <Text variant="labelMedium" style={{ color: action.destructive ? theme.colors.error : theme.colors.primary }}>
                  {action.label}
                </Text>
              </TouchableRipple>
            ))}
          </View>
        ) : null}

        {onSupport ? (
          <TouchableRipple onPress={onSupport} accessibilityRole="button" accessibilityLabel="Get support" testID={childTestID(id, 'support')}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              Get support
            </Text>
          </TouchableRipple>
        ) : null}
      </View>
    </AppSheet>
  );
};

const RouteRow = ({ icon, label }: { icon: string; label: string }) => {
  const theme = useAppTheme();
  return (
    <View style={styles.headerRow}>
      <Icon source={icon} size={14} color={theme.colors.onSurfaceVariant} />
      <Text variant="bodySmall" style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

const Notice = ({ icon, text, tone }: { icon: string; text: string; tone: 'warn' | 'error' }) => {
  const theme = useAppTheme();
  const bg = tone === 'error' ? theme.colors.errorContainer : theme.colors.surfaceVariant;
  const fg = tone === 'error' ? theme.colors.onErrorContainer : theme.colors.onSurfaceVariant;
  return (
    <View style={[styles.headerRow, { backgroundColor: bg, borderRadius: theme.radii.sm, padding: 8 }]} accessibilityLiveRegion="polite">
      <Icon source={icon} size={14} color={fg} />
      <Text variant="labelSmall" style={{ color: fg, marginLeft: 6, flex: 1 }}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
});
