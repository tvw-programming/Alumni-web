import React, { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Menu, RadioButton, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { Warehouse } from '../types/domain';

export interface WarehouseSelectorProps extends StyleEscapeHatches {
  warehouses: Warehouse[];
  selectedId?: string;
  variant?: 'menu' | 'dialog' | 'inline';
  onChange: (warehouseId: string) => void;
  loading?: boolean;
}

/**
 * Selection is always controlled by the caller — this component never
 * silently switches a warehouse when route or inventory constraints
 * change. A warehouse unavailable for the current route is shown, not
 * hidden, so the reason for its absence stays visible.
 */
export const WarehouseSelector = ({ warehouses, selectedId, variant = 'inline', onChange, loading = false, style, containerStyle, testID }: WarehouseSelectorProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? 'warehouse-selector';
  const [menuVisible, setMenuVisible] = useState(false);
  const [query, setQuery] = useState('');
  const selected = warehouses.find((w) => w.id === selectedId);
  const filtered = warehouses.filter((w) => `${w.name} ${w.city ?? ''} ${w.code ?? ''}`.toLowerCase().includes(query.toLowerCase()));

  if (loading) {
    return (
      <View style={[styles.loadingRow, containerStyle, style]} testID={`${id}-loading`}>
        <ActivityIndicator size={16} />
        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginLeft: 6 }}>
          Loading warehouses…
        </Text>
      </View>
    );
  }

  const list = (
    <ScrollView style={variant === 'inline' ? undefined : styles.menuList}>
      <TextInput mode="outlined" dense placeholder="Search by name, city, or code" value={query} onChangeText={setQuery} style={{ marginBottom: 8 }} testID={childTestID(id, 'search')} />
      <RadioButton.Group value={selectedId ?? ''} onValueChange={onChange}>
        {filtered.length === 0 ? (
          <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, padding: 8 }}>
            No warehouses found.
          </Text>
        ) : (
          filtered.map((w) => {
            const disabled = w.serviceability === 'unavailable';
            return (
              <TouchableRipple
                key={w.id}
                onPress={disabled ? undefined : () => { onChange(w.id); setMenuVisible(false); }}
                disabled={disabled}
                style={[styles.item, { opacity: disabled ? 0.5 : 1 }]}
                testID={childTestID(id, `option-${w.id}`)}
              >
                <View style={styles.itemRow}>
                  <RadioButton value={w.id} disabled={disabled} />
                  <View style={styles.flex}>
                    <View style={styles.row}>
                      <Text variant="bodyMedium">{w.name}</Text>
                      {w.isDefault ? (
                        <Text variant="labelSmall" style={{ color: theme.colors.primary, marginLeft: 6 }}>
                          Default
                        </Text>
                      ) : null}
                    </View>
                    {w.city ? (
                      <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                        {w.city}
                      </Text>
                    ) : null}
                    <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                      {w.shipmentCount != null ? `${w.shipmentCount} shipments pending` : ''}
                      {w.stockCount != null ? `${w.shipmentCount != null ? ' · ' : ''}${w.stockCount} in stock` : ''}
                    </Text>
                    {w.serviceability === 'checking' ? (
                      <View style={styles.row}>
                        <ActivityIndicator size={10} />
                        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginLeft: 4 }}>
                          Checking serviceability…
                        </Text>
                      </View>
                    ) : disabled ? (
                      <View style={styles.row}>
                        <Icon source="alert-outline" size={11} color={agri.colors.warning} />
                        <Text variant="labelSmall" style={{ color: agri.colors.warning, marginLeft: 4 }}>
                          Not serviceable for this route
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </TouchableRipple>
            );
          })
        )}
      </RadioButton.Group>
    </ScrollView>
  );

  if (variant === 'inline') {
    return (
      <View style={[containerStyle, style]} testID={id}>
        {list}
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={
          <TouchableRipple onPress={() => setMenuVisible(true)} style={[styles.anchor, { borderRadius: theme.radii.sm, borderColor: agri.colors.surfaceVariant }]} testID={childTestID(id, 'anchor')}>
            <View style={styles.row}>
              <Icon source="warehouse" size={16} color={agri.colors.onSurfaceVariant} />
              <Text variant="bodyMedium" style={{ marginLeft: 6 }}>
                {selected ? selected.name : 'Select warehouse'}
              </Text>
              <Icon source="chevron-down" size={16} color={agri.colors.onSurfaceVariant} />
            </View>
          </TouchableRipple>
        }
      >
        <View style={styles.menuBody}>{list}</View>
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  loadingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  menuList: { maxHeight: 320 },
  menuBody: { width: 280, padding: 8 },
  item: { paddingVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  anchor: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderWidth: StyleSheet.hairlineWidth, justifyContent: 'space-between' },
});
