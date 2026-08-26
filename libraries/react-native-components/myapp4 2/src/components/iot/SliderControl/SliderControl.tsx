import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Slider from '@react-native-community/slider';
import { ActivityIndicator, HelperText, IconButton, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';

export interface SliderControlProps extends StyleEscapeHatches {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  valueLabel?: string;
  disabled?: boolean;
  loading?: boolean;
  onChange: (value: number) => void;
  onChangeComplete?: (value: number) => void;
}

/**
 * The visual value tracks the drag immediately; the device command is only
 * ever sent on release via `onChangeComplete` — high-frequency network
 * commands are the caller's problem to throttle, this component just
 * separates "what the user is dragging" from "what was committed."
 */
export const SliderControl = ({ label, value, min, max, step = 1, unit, valueLabel, disabled = false, loading = false, onChange, onChangeComplete, style, containerStyle, testID }: SliderControlProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `slider-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const displayValue = valueLabel ?? `${Math.round(localValue)}${unit ?? ''}`;

  const step1 = () => {
    const next = Math.max(min, localValue - step);
    setLocalValue(next);
    onChange(next);
    onChangeComplete?.(next);
  };
  const stepUp = () => {
    const next = Math.min(max, localValue + step);
    setLocalValue(next);
    onChange(next);
    onChangeComplete?.(next);
  };

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <Text variant="labelMedium" style={styles.flex}>
          {label}
        </Text>
        {loading ? <ActivityIndicator size={14} /> : <Text variant="labelMedium">{displayValue}</Text>}
      </View>

      <View style={styles.row}>
        <IconButton icon="minus" size={16} mode="outlined" disabled={disabled || localValue <= min} onPress={step1} accessibilityLabel={`Decrease ${label.toLowerCase()}`} testID={childTestID(id, 'decrement')} />
        <Slider
          style={styles.flex}
          value={localValue}
          minimumValue={min}
          maximumValue={max}
          step={step}
          disabled={disabled}
          onValueChange={setLocalValue}
          onSlidingComplete={(v: number) => {
            onChange(v);
            onChangeComplete?.(v);
          }}
          minimumTrackTintColor={theme.colors.primary}
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityValue={{ min, max, now: localValue, text: displayValue }}
          testID={childTestID(id, 'slider')}
        />
        <IconButton icon="plus" size={16} mode="outlined" disabled={disabled || localValue >= max} onPress={stepUp} accessibilityLabel={`Increase ${label.toLowerCase()}`} testID={childTestID(id, 'increment')} />
      </View>

      <View style={styles.headerRow}>
        <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
          {min}
          {unit ?? ''}
        </Text>
        <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
          {max}
          {unit ?? ''}
        </Text>
      </View>

      {disabled ? (
        <HelperText type="info" visible>
          Device offline
        </HelperText>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
