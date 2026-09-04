import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Icon } from 'react-native-paper';

import { ListItemRow, StatusBadge, type SwipeAction } from '@ui';
import { useAppTheme } from '@/theme';
import { formatMinorUnits, formatRelativeDate } from '@/utils';
import type { Order } from '@/services/types';

export interface OrderRowProps {
  order: Order;
  index: number;
  onPress: (order: Order) => void;
  onCancel: (order: Order) => void;
  onTrack: (order: Order) => void;
}

export const OrderRow = memo(function OrderRow({ order, index, onPress, onCancel, onTrack }: OrderRowProps) {
  const theme = useAppTheme();

  // Stable per-order handlers keep the memoised row from re-rendering.
  const swipeActions = useMemo(
    () => ({
      left: [
        { key: 'track', label: 'Track', icon: 'truck-outline', intent: 'info', onPress: () => onTrack(order) },
      ] as SwipeAction[],
      right: [
        { key: 'cancel', label: 'Cancel', icon: 'close-circle-outline', intent: 'error', onPress: () => onCancel(order) },
      ] as SwipeAction[],
    }),
    [onCancel, onTrack, order],
  );

  return (
    <ListItemRow
      title={order.reference}
      subtitle={`${formatMinorUnits(order.totalMinor, order.currency, 'en-IN')} · ${formatRelativeDate(order.placedAt)}`}
      leading={
        <View
          style={{
            width: theme.sizing.avatar.md,
            height: theme.sizing.avatar.md,
            borderRadius: theme.radii.pill,
            backgroundColor: theme.colors.surfaceVariant,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon source="package-variant-closed" size={theme.sizing.icon.md} color={theme.colors.onSurfaceVariant} />
        </View>
      }
      trailing={<StatusBadge status={order.status} size="sm" withDot pulse={order.status === 'pending'} />}
      swipeActions={swipeActions}
      onPress={() => onPress(order)}
      divider
      entering="slideUp"
      index={index}
      testID={`order-${order.id}`}
    />
  );
});
