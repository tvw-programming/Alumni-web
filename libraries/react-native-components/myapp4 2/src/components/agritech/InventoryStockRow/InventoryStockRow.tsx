import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { InventoryStatus, InventoryStockItem } from '../types/domain';

export interface InventoryStockRowProps extends StyleEscapeHatches {
  item: InventoryStockItem;
  onPress?: (item: InventoryStockItem) => void;
  onAdjust?: (item: InventoryStockItem) => void;
}

const STATUS_META: Record<InventoryStatus, { label: string; colorKey: 'stockHealthy' | 'stockLow' | 'stockOut' | 'error' }> = {
  healthy: { label: 'In stock', colorKey: 'stockHealthy' },
  low: { label: 'Low stock', colorKey: 'stockLow' },
  outOfStock: { label: 'Out of stock', colorKey: 'stockOut' },
  overstock: { label: 'Overstock', colorKey: 'stockLow' },
  syncError: { label: "Couldn't sync", colorKey: 'error' },
};

/**
 * Never colours an item low-stock without also showing quantity and
 * reorder point — "available," "reserved," and "sellable" always stay
 * distinguished in text rather than collapsed into one number.
 */
export const InventoryStockRow = ({ item, onPress, onAdjust, style, containerStyle, testID }: InventoryStockRowProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `inventory-${item.sku}`;
  const [menuVisible, setMenuVisible] = React.useState(false);
  const meta = STATUS_META[item.status];
  const unit = item.unitLabel ?? 'units';

  return (
    <TouchableRipple onPress={onPress ? () => onPress(item) : undefined} disabled={!onPress} style={[styles.row, { borderRadius: theme.radii.sm }, containerStyle, style]} testID={id}>
      <View style={styles.rowInner}>
        <View style={styles.flex}>
          <Text variant="bodyMedium">{item.productName}</Text>
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
            SKU {item.sku}
            {item.warehouseName ? ` · ${item.warehouseName}` : ''}
          </Text>
          <View style={styles.row}>
            <Icon source={item.status === 'healthy' ? 'check-circle-outline' : 'alert-outline'} size={11} color={agri.colors[meta.colorKey]} />
            <Text variant="labelSmall" style={{ color: agri.colors[meta.colorKey], marginLeft: 4 }}>
              {meta.label} · Available: {item.quantity} {unit}
              {item.reservedQuantity != null ? ` · Reserved: ${item.reservedQuantity}` : ''}
            </Text>
          </View>
          {item.reorderPoint != null ? (
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              Reorder point: {item.reorderPoint}
            </Text>
          ) : null}
          {item.updatedAt ? (
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              Updated {item.updatedAt}
            </Text>
          ) : null}
        </View>
        {onAdjust ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel="Stock actions" style={styles.noMargin} testID={childTestID(id, 'menu')} />}
          >
            <Menu.Item onPress={() => { setMenuVisible(false); onAdjust(item); }} title="Adjust stock" leadingIcon="pencil-outline" />
          </Menu>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { paddingVertical: 4 },
  rowInner: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
});
