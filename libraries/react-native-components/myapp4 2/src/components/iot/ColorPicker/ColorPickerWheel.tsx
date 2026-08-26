import React, { useCallback, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import { Icon, SegmentedButtons, Text } from 'react-native-paper';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import { SliderControl } from '../SliderControl/SliderControl';
import type { ColorPreset, LightColorCapability } from '../types/domain';
import { ColorPresetChips } from './ColorPresetChips';

export interface ColorPickerWheelProps extends StyleEscapeHatches {
  color: string;
  brightness?: number;
  capability?: LightColorCapability;
  presets?: ColorPreset[];
  onChange: (color: string) => void;
  onChangeComplete?: (color: string) => void;
  onBrightnessChange?: (value: number) => void;
  onSaveScene?: () => void;
}

const hsvToHex = (h: number, s: number, v: number) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const toHex = (n: number) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Colour is never the only way to express a choice — hue is always
 * announced numerically ("Hue 210 degrees") and preset chips (with real
 * names) sit alongside the wheel as a fully equivalent fallback. Continuous
 * drag updates the local swatch only; `onChangeComplete` is the point a
 * device command would actually be sent.
 */
export const ColorPickerWheel = ({ color, brightness, capability, presets = [], onChange, onChangeComplete, onBrightnessChange, onSaveScene, style, containerStyle, testID }: ColorPickerWheelProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? 'color-picker-wheel';
  const size = iot.layout.colorWheelSize;
  const [hue, setHue] = useState(0);
  const [mode, setMode] = useState<'wheel' | 'presets'>(presets.length > 0 ? 'presets' : 'wheel');
  const center = size / 2;
  const radius = size / 2 - 8;

  const updateFromTouch = useCallback(
    (x: number, y: number) => {
      const dx = x - center;
      const dy = y - center;
      const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      const normalized = (angle + 360) % 360;
      setHue(normalized);
      onChange(hsvToHex(normalized, 1, 1));
    },
    [center, onChange],
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        updateFromTouch(locationX, locationY);
      },
      onPanResponderRelease: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const dx = locationX - center;
        const dy = locationY - center;
        const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
        const normalized = (angle + 360) % 360;
        onChangeComplete?.(hsvToHex(normalized, 1, 1));
      },
    }),
  ).current;

  if (capability && !capability.supportsColor) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <Text variant="bodySmall" style={{ color: iot.colors.onSurfaceVariant }}>
          Device does not support color.
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      {presets.length > 0 ? (
        <SegmentedButtons value={mode} onValueChange={(v) => setMode(v as 'wheel' | 'presets')} buttons={[{ value: 'presets', label: 'Presets' }, { value: 'wheel', label: 'Custom' }]} style={{ marginBottom: theme.spacing.sm }} />
      ) : null}

      {mode === 'presets' && presets.length > 0 ? (
        <ColorPresetChips presets={presets} selectedColor={color} onSelect={(preset) => { onChange(preset.color); onChangeComplete?.(preset.color); }} testID={childTestID(id, 'presets')} />
      ) : (
        <View style={styles.wheelWrap}>
          <View {...panResponder.panHandlers} style={{ width: size, height: size }}>
            <Svg width={size} height={size}>
              <Defs>
                <RadialGradient id="grad" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor="#FFFFFF" />
                  <Stop offset="100%" stopColor={hsvToHex(hue, 1, 1)} />
                </RadialGradient>
              </Defs>
              <Circle cx={center} cy={center} r={radius} fill="url(#grad)" stroke={iot.colors.surfaceVariant} strokeWidth={2} />
            </Svg>
          </View>
          <Text
            variant="labelSmall"
            style={{ color: iot.colors.onSurfaceVariant, marginTop: 8 }}
            accessibilityRole="adjustable"
            accessibilityLabel="Hue"
            accessibilityValue={{ min: 0, max: 360, now: Math.round(hue), text: `Hue ${Math.round(hue)} degrees` }}
          >
            Hue {Math.round(hue)}°
          </Text>
        </View>
      )}

      <View style={[styles.row, { marginTop: theme.spacing.sm }]}>
        <View style={[styles.swatch, { backgroundColor: color }]} accessibilityElementsHidden />
        <Text variant="labelMedium" style={{ marginLeft: 8 }}>
          {color.toUpperCase()}
        </Text>
      </View>

      {capability?.supportsBrightness && onBrightnessChange && brightness != null ? (
        <SliderControl label="Brightness" value={brightness} min={1} max={100} unit="%" onChange={onBrightnessChange} containerStyle={{ marginTop: theme.spacing.sm }} />
      ) : null}

      {onSaveScene ? (
        <Text variant="labelMedium" onPress={onSaveScene} accessibilityRole="button" style={{ color: theme.colors.primary, marginTop: theme.spacing.sm }} testID={childTestID(id, 'save-scene')}>
          Save as scene
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wheelWrap: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(0,0,0,0.1)' },
});
