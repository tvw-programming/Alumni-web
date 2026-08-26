import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { Amenity } from '../types/domain';

export interface AmenityIconGridProps extends StyleEscapeHatches {
  amenities: Amenity[];
  maxVisible?: number;
  columns?: number;
  showAvailability?: boolean;
  onShowAll?: () => void;
}

const AVAILABILITY_SUFFIX: Partial<Record<NonNullable<Amenity['availability']>, string>> = {
  paid: ' (paid)',
  unavailable: ' (unavailable)',
  unknown: ' (details unavailable)',
};

/**
 * Compact icon-plus-label grid with a full text-list accessible alternative —
 * a screen reader gets the same amenity names and qualifiers a sighted user
 * sees, not just a row of icons. A generic accessibility icon never stands in
 * for a real description; a scope-incomplete amenity says so.
 */
export const AmenityIconGrid = ({
  amenities,
  maxVisible = 6,
  columns = 3,
  showAvailability = true,
  onShowAll,
  style,
  containerStyle,
  testID,
}: AmenityIconGridProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? 'amenity-icon-grid';

  const visible = useMemo(() => amenities.slice(0, maxVisible), [amenities, maxVisible]);
  const hiddenCount = amenities.length - visible.length;

  const a11ySummary = useMemo(
    () =>
      amenities
        .map((a) => `${a.label}${a.availability && AVAILABILITY_SUFFIX[a.availability] ? AVAILABILITY_SUFFIX[a.availability] : ''}`)
        .join(', '),
    [amenities],
  );

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View
        style={[styles.grid, { gap: theme.spacing.sm }]}
        accessibilityRole="text"
        accessibilityLabel={`Amenities: ${a11ySummary}`}
      >
        {visible.map((amenity) => {
          const unavailable = amenity.availability === 'unavailable';
          return (
            <View key={amenity.id} style={[styles.cell, { width: `${100 / columns}%` }]} importantForAccessibility="no">
              <Icon
                source={amenity.icon}
                size={travel.layout.amenityIconSize}
                color={unavailable ? theme.colors.onSurfaceDisabled : theme.colors.onSurfaceVariant}
              />
              <Text
                variant="labelSmall"
                numberOfLines={2}
                style={{ color: unavailable ? theme.colors.onSurfaceDisabled : theme.colors.onSurface, marginTop: 4, textAlign: 'center' }}
              >
                {amenity.label}
                {showAvailability && amenity.availability === 'paid' ? ' · Paid' : ''}
              </Text>
              {showAvailability && amenity.availability === 'unavailable' ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceDisabled, textAlign: 'center' }}>
                  Unavailable
                </Text>
              ) : null}
              {amenity.scope === 'room' ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
                  In room
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      {hiddenCount > 0 && onShowAll ? (
        <TouchableRipple
          onPress={onShowAll}
          accessibilityRole="button"
          accessibilityLabel={`Show all ${amenities.length} amenities`}
          style={{ marginTop: theme.spacing.sm, alignSelf: 'flex-start' }}
          testID={childTestID(id, 'show-all')}
        >
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Show all amenities ({amenities.length})
          </Text>
        </TouchableRipple>
      ) : null}

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
        Amenity information provided by the property.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { alignItems: 'center', paddingVertical: 6 },
});
