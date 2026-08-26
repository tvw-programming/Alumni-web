import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { RingProgress } from '../primitives/RingProgress';
import { useWellnessTheme } from '../theme/fitnessTokens';
import type { ActivityRing } from '../types/domain';

export interface ActivityRingsProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  rings: ActivityRing[];
  dateLabel?: string;
  ownerLabel?: string;
  showValues?: boolean;
  size?: number;
  onPressRing?: (ringId: string) => void;
}

/**
 * Reserved for a small set of related personal goals — never a dumping
 * ground for unrelated metrics, per the platform guidance this pattern
 * comes from. Whose rings these are is always stated in `ownerLabel`, and
 * every ring gets a full text equivalent ("Steps: 8,420 of 10,000, 84
 * percent complete") alongside the visual.
 */
export const ActivityRings = ({ rings, dateLabel, ownerLabel, showValues = true, size, animated = true, onPressRing, style, containerStyle, testID }: ActivityRingsProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'activity-rings';
  const ringSize = size ?? wellness.layout.ringSizeLarge;

  const specs = rings.map((ring) => {
    const unavailable = ring.status === 'unavailable';
    return {
      id: ring.id,
      progress: unavailable ? 0 : Math.min(1, ring.value / Math.max(1, ring.goal)),
      color: unavailable ? wellness.colors.ringTrack : wellness.colors[ring.colorToken],
      trackColor: wellness.colors.ringTrack,
    };
  });

  return (
    <View style={[containerStyle, style]} testID={id}>
      {ownerLabel ? (
        <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant, marginBottom: 4 }}>
          {ownerLabel}
        </Text>
      ) : null}

      <View style={styles.row}>
        <RingProgress
          size={ringSize}
          strokeWidth={ringSize > 120 ? 14 : 8}
          gap={ringSize > 120 ? 6 : 3}
          animated={animated}
          rings={specs}
          testID={childTestID(id, 'ring')}
          center={
            dateLabel ? (
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                {dateLabel}
              </Text>
            ) : undefined
          }
        />

        {showValues ? (
          <View style={[styles.legend, { marginLeft: theme.spacing.md }]}>
            {rings.map((ring) => {
              const unavailable = ring.status === 'unavailable';
              const stale = ring.status === 'stale';
              const complete = ring.status === 'complete';
              const percent = Math.round(Math.min(1, ring.value / Math.max(1, ring.goal)) * 100);
              const a11yLabel = unavailable
                ? `${ring.label}: data unavailable`
                : `${ring.label}: ${ring.value.toLocaleString()} of ${ring.goal.toLocaleString()} ${ring.unit}, ${percent} percent complete${stale ? ', data may be stale' : ''}`;

              return (
                <TouchableRipple
                  key={ring.id}
                  onPress={onPressRing ? () => onPressRing(ring.id) : undefined}
                  disabled={!onPressRing}
                  accessibilityRole={onPressRing ? 'button' : 'text'}
                  accessibilityLabel={a11yLabel}
                  style={styles.legendRow}
                  testID={childTestID(id, `legend-${ring.id}`)}
                >
                  <View style={styles.legendItem}>
                    <View style={[styles.dot, { backgroundColor: unavailable ? wellness.colors.onSurfaceVariant : wellness.colors[ring.colorToken] }]} />
                    <View style={styles.flex}>
                      <Text variant="labelMedium">{ring.label}</Text>
                      {unavailable ? (
                        <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                          Data unavailable
                        </Text>
                      ) : (
                        <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                          {ring.value.toLocaleString()} / {ring.goal.toLocaleString()} {ring.unit}
                        </Text>
                      )}
                    </View>
                    {complete ? <Icon source="check-circle" size={14} color={wellness.colors.success} /> : null}
                    {stale ? <Icon source="clock-alert-outline" size={14} color={wellness.colors.warning} /> : null}
                  </View>
                </TouchableRipple>
              );
            })}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  legend: { flex: 1, gap: 8 },
  legendRow: {},
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  flex: { flex: 1 },
});
