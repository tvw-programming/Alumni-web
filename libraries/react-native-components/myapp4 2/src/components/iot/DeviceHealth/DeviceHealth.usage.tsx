/**
 * USAGE — BatteryIndicator + SignalStrengthIcon
 *
 * A critical battery and an offline signal render with different icons and
 * different words — never the same red glyph standing in for two unrelated
 * problems.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { BatteryStatus, SignalProtocol, SignalStatus } from '../types/domain';
import { BatteryIndicator } from './BatteryIndicator';
import { SignalStrengthIcon } from './SignalStrengthIcon';
import sample from './DeviceHealth.sample.json';

const data = loadSample<{
  batteries: { level: number | null; charging: boolean; status: BatteryStatus }[];
  signals: { level?: number; status: SignalStatus; protocol: SignalProtocol }[];
}>(sample);

export const DeviceHealthUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="titleSmall">Battery states</Text>
        {data.batteries.map((battery, index) => (
          <BatteryIndicator key={index} level={battery.level ?? undefined} charging={battery.charging} status={battery.status} />
        ))}
      </View>

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="titleSmall">Signal states</Text>
        {data.signals.map((signal, index) => (
          <SignalStrengthIcon key={index} level={signal.level} status={signal.status} protocol={signal.protocol} />
        ))}
      </View>
    </ScrollView>
  );
};
