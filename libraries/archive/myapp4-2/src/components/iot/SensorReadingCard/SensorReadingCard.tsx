import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';
import Svg, { Polyline } from 'react-native-svg';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { SensorReading, SensorStatus, SensorTrend } from '../types/domain';

export interface SensorReadingCardProps extends StyleEscapeHatches {
  reading: SensorReading;
  thresholdNote?: string;
  onPress?: () => void;
}

const STATUS_META: Record<SensorStatus, { label: string; icon: string; colorKey: 'online' | 'warning' | 'error' | 'offline' }> = {
  normal: { label: 'Normal', icon: 'check-circle-outline', colorKey: 'online' },
  warning: { label: 'Outside normal range', icon: 'alert-outline', colorKey: 'warning' },
  critical: { label: 'Critical', icon: 'alert-circle', colorKey: 'error' },
  stale: { label: 'Last known reading', icon: 'clock-alert-outline', colorKey: 'offline' },
  offline: { label: 'Sensor offline', icon: 'wifi-off', colorKey: 'offline' },
};

const TREND_ICON: Record<SensorTrend, string> = {
  up: 'trending-up',
  down: 'trending-down',
  stable: 'trending-neutral',
  unknown: 'help-circle-outline',
};

/**
 * A reading never states "critical" without a paired, product-specific
 * explanation — `thresholdNote` carries that context, and the sparkline
 * always has a text/table fallback ("Show values") for anyone who can't
 * or doesn't want to read a chart.
 */
export const SensorReadingCard = ({ reading, thresholdNote, onPress, style, containerStyle, testID }: SensorReadingCardProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `sensor-${reading.label.toLowerCase().replace(/\s+/g, '-')}`;
  const [showValues, setShowValues] = useState(false);
  const status = reading.status ?? 'normal';
  const meta = STATUS_META[status];
  const hasValue = reading.value != null;
  const stale = status === 'stale' || status === 'offline';

  return (
    <AppCard variant="outlined" onPress={onPress} containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: 4 }}>
        <View style={styles.row}>
          <Text variant="labelMedium" style={[styles.flex, { color: iot.colors.onSurfaceVariant }]}>
            {reading.label}
          </Text>
          {reading.trend ? <Icon source={TREND_ICON[reading.trend]} size={14} color={iot.colors.onSurfaceVariant} /> : null}
        </View>

        <Text variant="headlineSmall" style={{ color: stale ? iot.colors.onSurfaceVariant : theme.colors.onSurface }} accessibilityLabel={hasValue ? `${reading.value} ${reading.unit}` : 'No reading available'}>
          {hasValue ? `${reading.value}${reading.unit}` : '—'}
        </Text>

        <View style={styles.row}>
          <Icon source={meta.icon} size={12} color={iot.colors[meta.colorKey]} />
          <Text variant="labelSmall" style={{ color: iot.colors[meta.colorKey], marginLeft: 4, flex: 1 }}>
            {meta.label}
            {reading.timestamp ? ` · ${reading.timestamp}` : ''}
          </Text>
        </View>

        {status === 'critical' || status === 'warning' ? (
          thresholdNote ? (
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
              {thresholdNote}
            </Text>
          ) : null
        ) : null}

        {reading.sparkline && reading.sparkline.length > 1 ? (
          <View>
            <View style={{ height: 32, marginTop: 4 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <Sparkline values={reading.sparkline} color={iot.colors[meta.colorKey]} height={32} />
            </View>
            <View style={styles.row}>
              <IconButton
                icon={showValues ? 'chevron-up' : 'chevron-down'}
                size={14}
                onPress={() => setShowValues((v) => !v)}
                style={styles.noMargin}
                accessibilityLabel={showValues ? 'Hide recent values' : 'Show recent values'}
                testID={childTestID(id, 'toggle-values')}
              />
              <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
                {showValues ? 'Hide values' : 'Show values'}
              </Text>
            </View>
            {showValues ? (
              <View style={[styles.valuesBox, { backgroundColor: iot.colors.surfaceVariant, borderRadius: theme.radii.sm }]}>
                {reading.sparkline.map((v, i) => (
                  <Text key={i} variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
                    {v}
                    {reading.unit}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>
    </AppCard>
  );
};

const Sparkline = ({ values, color, height }: { values: number[]; color: string; height: number }) => {
  const width = 140;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  const points = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - ((v - min) / span) * height}`).join(' ');

  return (
    <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
  valuesBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 8, marginTop: 4 },
});
