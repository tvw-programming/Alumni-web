import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { CompareRow, PropertySummary } from '../types/domain';

export interface ComparePropertiesTableProps extends StyleEscapeHatches {
  properties: PropertySummary[];
  rows: CompareRow[];
  highlightDifferences?: boolean;
  onRemove?: (propertyId: string) => void;
  onAddProperty?: () => void;
  maxProperties?: number;
}

const formatValue = (value: string | number | boolean | null, type: CompareRow['type']) => {
  if (value == null) return 'Not provided';
  if (type === 'status') return value ? 'Yes' : 'No';
  return String(value);
};

/**
 * Missing data reads "Not provided," never "No" — a missing amenity in one
 * listing's data is not proof the amenity doesn't exist. Differences are
 * always spelled out in text next to the highlight, never conveyed by a
 * background colour alone.
 */
export const ComparePropertiesTable = ({ properties, rows, highlightDifferences = true, onRemove, onAddProperty, maxProperties = 4, style, containerStyle, testID }: ComparePropertiesTableProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'compare-properties-table';

  const groups = useMemo(() => {
    const map = new Map<string, CompareRow[]>();
    for (const row of rows) {
      const key = row.group ?? 'General';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(row);
    }
    return Array.from(map.entries());
  }, [rows]);

  if (properties.length === 0) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <StateView preset="empty" compact title="No properties to compare" description="Add a property to start a comparison." />
        {onAddProperty ? (
          <TouchableRipple onPress={onAddProperty} accessibilityRole="button" accessibilityLabel="Add property to compare" style={{ marginTop: theme.spacing.sm, alignSelf: 'center' }}>
            <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
              Add a property
            </Text>
          </TouchableRipple>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header row: property identity */}
          <View style={styles.headerRow}>
            <View style={[styles.stickyCell, { backgroundColor: theme.colors.surface }]} />
            {properties.map((property) => (
              <View key={property.id} style={[styles.dataCell, { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.outlineVariant }]}>
                <Text variant="labelMedium" numberOfLines={2}>
                  {property.title}
                </Text>
                <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }} numberOfLines={1}>
                  {property.locality}
                </Text>
                {onRemove ? (
                  <IconButton icon="close" size={14} onPress={() => onRemove(property.id)} accessibilityLabel={`Remove ${property.title} from comparison`} style={styles.removeButton} testID={childTestID(id, `remove-${property.id}`)} />
                ) : null}
              </View>
            ))}
            {onAddProperty && properties.length < maxProperties ? (
              <TouchableRipple onPress={onAddProperty} accessibilityRole="button" accessibilityLabel="Add another property to compare" style={styles.addCell} testID={childTestID(id, 'add')}>
                <Icon source="plus" size={20} color={theme.colors.primary} />
              </TouchableRipple>
            ) : null}
          </View>

          {groups.map(([groupName, groupRows]) => (
            <View key={groupName}>
              <View style={[styles.groupHeader, { backgroundColor: realestate.colors.surfaceVariant }]}>
                <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant }}>
                  {groupName}
                </Text>
              </View>
              {groupRows.map((row) => {
                const values = properties.map((p) => row.values[p.id] ?? null);
                const distinct = new Set(values.map((v) => String(v))).size > 1;
                const shouldHighlight = highlightDifferences && distinct && properties.length > 1;

                return (
                  <View key={row.id} style={styles.dataRow} accessibilityRole="text" accessibilityLabel={`${row.label}: ${properties.map((p, i) => `${p.title}, ${formatValue(values[i]!, row.type)}`).join('; ')}`}>
                    <View style={[styles.stickyCell, { backgroundColor: theme.colors.surface, borderRightWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.outlineVariant }]}>
                      <Text variant="labelSmall">{row.label}</Text>
                    </View>
                    {properties.map((property) => {
                      const value = row.values[property.id] ?? null;
                      return (
                        <View
                          key={property.id}
                          style={[
                            styles.dataCell,
                            { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.outlineVariant },
                            shouldHighlight ? { backgroundColor: realestate.colors.surfaceVariant } : undefined,
                          ]}
                        >
                          <Text variant="bodySmall" style={value == null ? { color: realestate.colors.onSurfaceVariant, fontStyle: 'italic' } : undefined}>
                            {formatValue(value, row.type)}
                          </Text>
                          {shouldHighlight ? (
                            <Text variant="labelSmall" style={{ color: realestate.colors.primary }}>
                              Differs
                            </Text>
                          ) : null}
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row' },
  groupHeader: { paddingHorizontal: 8, paddingVertical: 4 },
  dataRow: { flexDirection: 'row' },
  stickyCell: { width: 110, padding: 8, justifyContent: 'center' },
  dataCell: { width: 130, padding: 8, gap: 2 },
  removeButton: { position: 'absolute', top: 0, right: 0, margin: 0 },
  addCell: { width: 60, alignItems: 'center', justifyContent: 'center' },
});
