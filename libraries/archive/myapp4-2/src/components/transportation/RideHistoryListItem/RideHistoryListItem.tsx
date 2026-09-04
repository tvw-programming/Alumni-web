import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { RideHistoryItem, RideHistoryStatus } from '../types/domain';

const STATUS_COPY: Record<RideHistoryStatus, { label: string; icon: string; colorKey: 'statusCompleted' | 'statusCanceled' | 'statusFailed' | 'statusReconnecting' }> = {
  completed: { label: 'Completed', icon: 'check-circle', colorKey: 'statusCompleted' },
  canceled: { label: 'Canceled', icon: 'cancel', colorKey: 'statusCanceled' },
  refunded: { label: 'Refunded', icon: 'cash-refund', colorKey: 'statusCompleted' },
  disputed: { label: 'Fare disputed', icon: 'alert-circle-outline', colorKey: 'statusFailed' },
  pending: { label: 'Payment pending', icon: 'clock-outline', colorKey: 'statusReconnecting' },
};

export type RideHistoryDensity = 'comfortable' | 'compact';

export interface RideHistoryListItemProps extends StyleEscapeHatches {
  item: RideHistoryItem;
  density?: RideHistoryDensity;
  showDriver?: boolean;
  showFare?: boolean;
  locale?: string;
  onPress?: (item: RideHistoryItem) => void;
  onReceipt?: (item: RideHistoryItem) => void;
  onSupport?: (item: RideHistoryItem) => void;
  onTip?: (item: RideHistoryItem) => void;
}

/**
 * Status is carried by an icon and a word, never by a coloured route line
 * alone. Every row assembles into one complete accessible label so a screen
 * reader announces the full trip in one pass rather than fragments.
 */
export const RideHistoryListItem = ({
  item,
  density = 'comfortable',
  showDriver = true,
  showFare = true,
  locale = 'en-IN',
  onPress,
  onReceipt,
  onSupport,
  onTip,
  style,
  containerStyle,
  testID,
}: RideHistoryListItemProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? `ride-history-${item.id}`;
  const meta = STATUS_COPY[item.status];
  const compact = density === 'compact';

  const dateLabel = item.startedAt
    ? new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(item.startedAt))
    : undefined;

  const a11yLabel = `${item.rideType} ride, ${dateLabel ?? 'date unavailable'}, from ${item.pickupLabel} to ${item.dropoffLabel}, ${meta.label}${
    item.total ? `, ${formatMoney(item.total, { locale })}` : ''
  }`;

  return (
    <TouchableRipple onPress={onPress ? () => onPress(item) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} style={[containerStyle, style]} testID={id}>
      <View style={[styles.row, { paddingVertical: compact ? 8 : 12 }]}>
        <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Icon source="car" size={18} color={theme.colors.onSurfaceVariant} />
        </View>

        <View style={[styles.flex, { marginLeft: 12 }]}>
          <View style={styles.row}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
              {dateLabel ?? '—'}
            </Text>
            <View style={styles.row}>
              <Icon source={meta.icon} size={13} color={ride.colors[meta.colorKey]} />
              <Text variant="labelSmall" style={{ color: ride.colors[meta.colorKey], marginLeft: 4 }}>
                {meta.label}
              </Text>
            </View>
          </View>

          <Text variant="bodyMedium" numberOfLines={compact ? 1 : 2}>
            {item.pickupLabel} → {item.dropoffLabel}
          </Text>

          <View style={styles.row}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
              {item.rideType}
              {showDriver && item.driver ? ` · ${item.driver.name}` : ''}
            </Text>
            {showFare && item.total ? <Text variant="labelMedium">{formatMoney(item.total, { locale })}</Text> : null}
          </View>

          {!compact ? (
            <View style={[styles.row, { gap: theme.spacing.md, marginTop: 4 }]}>
              {onReceipt && item.receiptAvailable ? (
                <ActionLink label="View receipt" onPress={() => onReceipt(item)} testID={childTestID(id, 'receipt')} />
              ) : null}
              {onTip && item.tipStatus === 'available' ? <ActionLink label="Add a tip" onPress={() => onTip(item)} testID={childTestID(id, 'tip')} /> : null}
              {item.tipStatus === 'added' ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Tip added
                </Text>
              ) : null}
              {onSupport ? <ActionLink label="Get help" onPress={() => onSupport(item)} testID={childTestID(id, 'support')} /> : null}
            </View>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
};

const ActionLink = ({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) => {
  const theme = useAppTheme();
  return (
    <Text variant="labelSmall" onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ color: theme.colors.primary }} testID={testID}>
      {label}
    </Text>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
