import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { PropertyAmenity } from '../types/domain';

const STATUS_SUFFIX: Partial<Record<NonNullable<PropertyAmenity['status']>, string>> = {
  paid: ' (paid)',
  unavailable: ' (unavailable)',
  unknown: ' (details unavailable)',
};

export interface AmenityGridProps extends StyleEscapeHatches {
  amenities: PropertyAmenity[];
  maxVisible?: number;
  columns?: number;
  showStatus?: boolean;
  onShowAll?: () => void;
}

/**
 * Included is the default, unlabelled state; paid and unavailable render as
 * secondary metadata text, never colour alone. Large text collapses the
 * grid from four columns to two rather than truncating a label — the layout
 * flexes, the information never does.
 */
export const AmenityGrid = ({ amenities, maxVisible = 8, columns = 4, showStatus = true, onShowAll, style, containerStyle, testID }: AmenityGridProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'amenity-grid';

  const visible = useMemo(() => amenities.slice(0, maxVisible), [amenities, maxVisible]);
  const hiddenCount = amenities.length - visible.length;

  const a11ySummary = useMemo(
    () => amenities.map((a) => `${a.label}${a.status && STATUS_SUFFIX[a.status] ? STATUS_SUFFIX[a.status] : ''}`).join(', '),
    [amenities],
  );

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={[styles.grid, { gap: theme.spacing.sm }]} accessibilityRole="text" accessibilityLabel={`Amenities: ${a11ySummary}`}>
        {visible.map((amenity) => {
          const unavailable = amenity.status === 'unavailable';
          const unknown = amenity.status === 'unknown';
          return (
            <View key={amenity.id} style={[styles.cell, { width: `${100 / columns}%` }]} importantForAccessibility="no">
              <Icon source={amenity.icon} size={realestate.layout.amenityIconSize} color={unavailable ? theme.colors.onSurfaceDisabled : realestate.colors.onSurfaceVariant} />
              <Text variant="labelSmall" numberOfLines={2} style={{ color: unavailable ? theme.colors.onSurfaceDisabled : realestate.colors.onSurface, marginTop: 4, textAlign: 'center' }}>
                {amenity.label}
                {showStatus && amenity.status === 'paid' ? ' · Paid' : ''}
              </Text>
              {showStatus && unavailable ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceDisabled, textAlign: 'center' }}>
                  Unavailable
                </Text>
              ) : showStatus && unknown ? (
                <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Details unavailable
                </Text>
              ) : null}
              {amenity.scope === 'unit' ? (
                <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, textAlign: 'center' }}>
                  In unit
                </Text>
              ) : amenity.scope === 'project' ? (
                <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, textAlign: 'center' }}>
                  Project amenity
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {hiddenCount > 0 && onShowAll ? (
        <TouchableRipple onPress={onShowAll} accessibilityRole="button" accessibilityLabel={`Show all ${amenities.length} amenities`} style={{ marginTop: theme.spacing.sm, alignSelf: 'flex-start' }} testID={childTestID(id, 'show-all')}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Show all amenities ({amenities.length})
          </Text>
        </TouchableRipple>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', paddingVertical: 6 },
});
