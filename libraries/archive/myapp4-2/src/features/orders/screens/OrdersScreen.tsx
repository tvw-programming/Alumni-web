import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { LIST_ITEM_HEIGHTS, PaginatedList, SegmentedTabs, useConfirm, useSheet, useToast } from '@ui';
import { useAppTheme } from '@/theme';
import { formatMinorUnits, formatRelativeDate } from '@/utils';
import type { Order } from '@/services/types';

import { OrderRow } from '../components/OrderRow';
import { useCancelOrder, useOrders } from '../hooks/useOrders';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export const OrdersScreen = () => {
  const theme = useAppTheme();
  const [status, setStatus] = useState('all');
  const { data, isLoading, error, refetch, isRefetching } = useOrders(status);
  const cancelOrder = useCancelOrder(status);
  const confirm = useConfirm();
  const toast = useToast();
  const sheet = useSheet();

  const handleCancel = useCallback(
    async (order: Order) => {
      // Promise-based confirm: no pendingId state, no callback threading.
      const ok = await confirm({
        title: `Cancel ${order.reference}?`,
        message: 'This cannot be undone. Any payment will be refunded within 5 working days.',
        confirmLabel: 'Cancel order',
        cancelLabel: 'Keep it',
        destructive: true,
      });
      if (!ok) return;

      cancelOrder.mutate(order.id, {
        onSuccess: () => toast.success(`${order.reference} cancelled`),
        onError: () => toast.error('We could not cancel that order'),
      });
    },
    [cancelOrder, confirm, toast],
  );

  const handleOpen = useCallback(
    (order: Order) => {
      sheet.open(
        <View style={{ gap: theme.spacing.sm }}>
          {order.items.map((item) => (
            <View key={item.productId} style={styles.row}>
              <Text variant="bodyMedium" style={styles.flex}>
                {item.name} × {item.quantity}
              </Text>
              <Text variant="bodyMedium">{formatMinorUnits(item.priceMinor * item.quantity, order.currency, 'en-IN')}</Text>
            </View>
          ))}
          <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
            <Text variant="titleMedium" style={styles.flex}>
              Total
            </Text>
            <Text variant="titleMedium">{formatMinorUnits(order.totalMinor, order.currency, 'en-IN')}</Text>
          </View>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Placed {formatRelativeDate(order.placedAt)}
          </Text>
        </View>,
        { title: order.reference, variant: 'bottom' },
      );
    },
    [sheet, theme],
  );

  const handleTrack = useCallback((order: Order) => toast.show(`Tracking ${order.reference}`), [toast]);

  return (
    <View style={styles.flex}>
      <SegmentedTabs
        items={TABS}
        value={status}
        onChange={setStatus}
        variant="underline"
        containerStyle={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm }}
        testID="orders-tabs"
      />

      <PaginatedList<Order>
        data={data}
        estimatedItemSize={LIST_ITEM_HEIGHTS.md}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <OrderRow order={item} index={index} onPress={handleOpen} onCancel={handleCancel} onTrack={handleTrack} />
        )}
        loading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        emptyState={{ preset: 'empty', title: 'No orders here', description: 'Orders you place will show up in this tab.' }}
        skeletonShape="listItem"
        testID="orders-list"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
});
