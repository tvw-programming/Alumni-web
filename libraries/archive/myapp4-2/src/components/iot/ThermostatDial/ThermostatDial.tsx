import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, SegmentedButtons, Text } from 'react-native-paper';
import Svg, { Circle } from 'react-native-svg';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { ClimateMode, FanMode } from '../types/domain';

export interface ThermostatDialProps extends StyleEscapeHatches {
  targetTemperature: number;
  currentTemperature?: number;
  min: number;
  max: number;
  step: number;
  unit: 'C' | 'F';
  mode: ClimateMode;
  fanMode?: FanMode;
  updating?: boolean;
  onTemperatureChange: (value: number) => void;
  onModeChange: (mode: ClimateMode) => void;
}

const MODE_LABEL: Record<ClimateMode, string> = { heat: 'Heat', cool: 'Cool', auto: 'Auto', off: 'Off' };
const MODE_COLOR_KEY: Record<ClimateMode, 'climateHeat' | 'climateCool' | 'climateAuto' | 'climateOff'> = {
  heat: 'climateHeat',
  cool: 'climateCool',
  auto: 'climateAuto',
  off: 'climateOff',
};

/**
 * The dial supports drag, but plus/minus buttons are always present and
 * fully equivalent — the ring is never a gesture-only control. `target` and
 * `current` stay visually separate: if the thermostat rejects a set point,
 * the caller re-renders with the previous target and the dial never lies
 * about what was actually applied.
 */
export const ThermostatDial = ({ targetTemperature, currentTemperature, min, max, step, unit, mode, fanMode, updating = false, onTemperatureChange, onModeChange, style, containerStyle, testID }: ThermostatDialProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? 'thermostat-dial';
  const size = iot.layout.dialSize;
  const strokeWidth = 14;
  const radius = size / 2 - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(1, Math.max(0, (targetTemperature - min) / (max - min)));
  const colorKey = MODE_COLOR_KEY[mode];

  const adjust = (delta: number) => {
    const next = Math.min(max, Math.max(min, Math.round((targetTemperature + delta) / step) * step));
    onTemperatureChange(next);
  };

  return (
    <View style={[styles.root, containerStyle, style]} testID={id}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={radius} stroke={iot.colors.surfaceVariant} strokeWidth={strokeWidth} fill="transparent" />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={mode === 'off' ? iot.colors.offline : iot.colors[colorKey]}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            rotation={-90}
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>

        <View style={styles.center} accessibilityRole="adjustable" accessibilityLabel="Target temperature" accessibilityValue={{ min, max, now: targetTemperature, text: `${targetTemperature}°${unit}` }}>
          <Text variant="displaySmall" style={styles.tabular}>
            {targetTemperature}°{unit}
          </Text>
          {currentTemperature != null ? (
            <Text variant="labelMedium" style={{ color: iot.colors.onSurfaceVariant }}>
              Currently {currentTemperature}°{unit}
            </Text>
          ) : null}
          <Text variant="labelSmall" style={{ color: iot.colors[colorKey], marginTop: 2 }}>
            {updating ? 'Updating set point…' : `${MODE_LABEL[mode]}${fanMode ? ` · Fan ${fanMode}` : ''}`}
          </Text>
        </View>
      </View>

      <View style={[styles.row, { marginTop: theme.spacing.md, gap: theme.spacing.lg }]}>
        <IconButton icon="minus" mode="contained-tonal" size={22} disabled={mode === 'off' || targetTemperature <= min} onPress={() => adjust(-step)} accessibilityLabel="Decrease target temperature" testID={childTestID(id, 'decrement')} />
        <IconButton icon="plus" mode="contained-tonal" size={22} disabled={mode === 'off' || targetTemperature >= max} onPress={() => adjust(step)} accessibilityLabel="Increase target temperature" testID={childTestID(id, 'increment')} />
      </View>

      <SegmentedButtons
        value={mode}
        onValueChange={(v) => onModeChange(v as ClimateMode)}
        buttons={(Object.keys(MODE_LABEL) as ClimateMode[]).map((m) => ({ value: m, label: MODE_LABEL[m] }))}
        style={{ marginTop: theme.spacing.md }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
});
