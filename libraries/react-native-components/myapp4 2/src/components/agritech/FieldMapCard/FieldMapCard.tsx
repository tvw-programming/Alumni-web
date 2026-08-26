import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { Field, FieldStressLevel } from '../types/domain';

export interface FieldMapCardProps extends StyleEscapeHatches {
  field: Field;
  mapMode?: 'standard' | 'satellite';
  onPress: (field: Field) => void;
  onEditBoundary?: (field: Field) => void;
}

const STRESS_META: Record<Exclude<FieldStressLevel, 'none'>, { label: string; colorKey: 'warning' | 'error' }> = {
  low: { label: 'Low stress detected', colorKey: 'warning' },
  medium: { label: 'Medium stress detected', colorKey: 'warning' },
  high: { label: 'High stress detected', colorKey: 'error' },
};

/**
 * The map preview is never the only way to know a field's area or crop — a
 * text summary always sits alongside it. A missing boundary renders as its
 * own state rather than a blank or broken map tile.
 */
export const FieldMapCard = ({ field, mapMode = 'standard', onPress, onEditBoundary, style, containerStyle, testID }: FieldMapCardProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `field-${field.id}`;
  const stressMeta = field.stressLevel && field.stressLevel !== 'none' ? STRESS_META[field.stressLevel] : undefined;
  const hasBoundary = field.mapStatus === 'available' && field.boundary && field.boundary.length > 0;

  return (
    <AppCard variant="outlined" onPress={() => onPress(field)} containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: 6 }}>
        <View
          style={[
            styles.mapPreview,
            { height: agri.layout.mapPreviewHeight, borderRadius: theme.radii.sm, backgroundColor: agri.colors.surfaceVariant },
          ]}
        >
          {hasBoundary ? (
            <>
              <Icon source={mapMode === 'satellite' ? 'satellite-variant' : 'map-outline'} size={28} color={agri.colors.onSurfaceVariant} />
              <View style={styles.mapModeChip}>
                <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
                  {mapMode === 'satellite' ? 'Satellite' : 'Standard'}
                </Text>
              </View>
            </>
          ) : field.mapStatus === 'missing' ? (
            <>
              <Icon source="map-marker-off-outline" size={24} color={agri.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginTop: 4 }}>
                No boundary mapped yet
              </Text>
            </>
          ) : (
            <>
              <Icon source="map-marker-alert-outline" size={24} color={agri.colors.warning} />
              <Text variant="labelSmall" style={{ color: agri.colors.warning, marginTop: 4 }}>
                {field.mapStatus === 'error' ? 'Map failed to load' : 'Boundary data is outdated'}
              </Text>
            </>
          )}
        </View>

        <View style={styles.row}>
          <View style={styles.flex}>
            <Text variant="titleSmall">{field.name}</Text>
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              {field.area} {field.areaUnit}
              {field.cropName ? ` · ${field.cropName}` : ''}
            </Text>
          </View>
          {onEditBoundary ? (
            <IconButton icon="vector-polygon" size={16} onPress={() => onEditBoundary(field)} accessibilityLabel="Edit field boundary" style={styles.noMargin} testID={childTestID(id, 'edit')} />
          ) : null}
        </View>

        {stressMeta ? (
          <View style={styles.row}>
            <Icon source="alert-outline" size={12} color={agri.colors[stressMeta.colorKey]} />
            <Text variant="labelSmall" style={{ color: agri.colors[stressMeta.colorKey], marginLeft: 4 }}>
              {stressMeta.label}
            </Text>
          </View>
        ) : null}

        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {field.lastMappedAt ? `Mapped ${field.lastMappedAt}` : 'Not yet mapped'}
        </Text>

        <AppButton variant="ghost" size="sm" onPress={() => onPress(field)} testID={childTestID(id, 'view-map')}>
          View full map
        </AppButton>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  mapPreview: { alignItems: 'center', justifyContent: 'center' },
  mapModeChip: { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
});
