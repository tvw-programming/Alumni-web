import React from 'react';
import { View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { StyleSheet } from 'react-native';

import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { BatteryStatus } from '../types/domain';

export interface BatteryIndicatorProps extends StyleEscapeHatches {
  level?: number;
  charging?: boolean;
  status?: BatteryStatus;
  showLabel?: boolean;
}

const iconFor = (level: number | undefined, charging: boolean) => {
  if (charging) return 'battery-charging';
  if (level == null) return 'battery-unknown';
  if (level <= 10) return 'battery-outline';
  if (level <= 25) return 'battery-20';
  if (level <= 50) return 'battery-50';
  if (level <= 75) return 'battery-80';
  return 'battery';
};

/**
 * Low battery and a disconnected signal never share the same icon or
 * explanation — they mean different things and call for different actions,
 * so `BatteryIndicator` and `SignalStrengthIcon` always render distinct
 * icons and words even at a glance.
 */
export const BatteryIndicator = ({ level, charging = false, status = 'unknown', showLabel = true, style, containerStyle, testID }: BatteryIndicatorProps) => {
  const iot = useSmartHomeTheme();
  const id = testID ?? 'battery-indicator';
  const colorKey = charging ? 'batteryCharging' : status === 'critical' ? 'batteryCritical' : status === 'low' ? 'batteryLow' : status === 'normal' ? 'batteryNormal' : 'onSurfaceVariant';

  const label = charging ? 'Charging' : level == null ? 'Battery unknown' : status === 'critical' ? 'Critical battery' : status === 'low' ? 'Low battery' : `Battery ${level}%`;

  return (
    <View style={[styles.row, containerStyle, style]} testID={id} accessibilityRole="text" accessibilityLabel={level != null ? `Battery ${level} percent${charging ? ', charging' : ''}${status === 'low' ? ', low' : status === 'critical' ? ', critical' : ''}` : 'Battery level unknown'}>
      <Icon source={iconFor(level, charging)} size={16} color={iot.colors[colorKey]} />
      {showLabel ? (
        <Text variant="labelSmall" style={{ color: iot.colors[colorKey], marginLeft: 4 }}>
          {label}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
