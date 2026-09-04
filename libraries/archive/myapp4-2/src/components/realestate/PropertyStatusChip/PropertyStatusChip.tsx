import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { PropertyStatus } from '../types/domain';

const STATUS_META: Record<PropertyStatus, { label: string; icon: string; colorKey: 'ready' | 'underConstruction' | 'sold' | 'newLaunch' | 'priceReduced' | 'pending' | 'verified' }> = {
  ready: { label: 'Ready to move', icon: 'home-outline', colorKey: 'ready' },
  underConstruction: { label: 'Under construction', icon: 'crane', colorKey: 'underConstruction' },
  sold: { label: 'Sold', icon: 'close-circle-outline', colorKey: 'sold' },
  rented: { label: 'Rented', icon: 'key-outline', colorKey: 'sold' },
  priceReduced: { label: 'Price reduced', icon: 'trending-down', colorKey: 'priceReduced' },
  newLaunch: { label: 'New launch', icon: 'star-outline', colorKey: 'newLaunch' },
  pending: { label: 'Pending', icon: 'clock-outline', colorKey: 'pending' },
  verified: { label: 'Verified listing', icon: 'shield-check-outline', colorKey: 'verified' },
};

export interface PropertyStatusChipProps extends StyleEscapeHatches {
  status: PropertyStatus;
  label?: string;
  detail?: string;
  compact?: boolean;
  onPress?: () => void;
}

/**
 * Muted, non-alarming treatment throughout — sold and rented use the same
 * neutral grey rather than a stop-sign red, and every chip pairs its colour
 * with an icon and a word so status never depends on colour perception. This
 * chip never implies legal or construction certification on its own; that
 * comes from a verified property-status service via `detail`.
 */
export const PropertyStatusChip = ({ status, label, detail, compact = false, onPress, style, containerStyle, testID }: PropertyStatusChipProps) => {
  const theme = useAppTheme();
  const property = usePropertyTheme();
  const id = testID ?? `property-status-${status}`;
  const meta = STATUS_META[status];
  const text = label ?? meta.label;

  const a11yLabel = `${text}${detail ? `, ${detail}` : ''}`;

  if (compact) {
    return (
      <View style={[styles.compactRow, containerStyle, style]} testID={id} accessibilityRole="text" accessibilityLabel={a11yLabel}>
        <Icon source={meta.icon} size={12} color={property.colors[meta.colorKey]} />
        <Text variant="labelSmall" style={{ color: property.colors[meta.colorKey], marginLeft: 3 }}>
          {text}
        </Text>
      </View>
    );
  }

  return (
    <TouchableRipple onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} style={[containerStyle, style]} testID={id}>
      <View>
        <Chip
          compact
          mode="flat"
          icon={() => <Icon source={meta.icon} size={14} color={property.colors[meta.colorKey]} />}
          style={{ backgroundColor: property.colors.surfaceVariant }}
          textStyle={{ color: property.colors[meta.colorKey] }}
        >
          {text}
        </Chip>
        {detail ? (
          <Text variant="labelSmall" style={{ color: property.colors.onSurfaceVariant, marginTop: 2 }}>
            {detail}
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  compactRow: { flexDirection: 'row', alignItems: 'center' },
});
