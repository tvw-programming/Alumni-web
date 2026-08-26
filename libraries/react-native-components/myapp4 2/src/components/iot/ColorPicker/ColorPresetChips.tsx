import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { ColorPreset } from '../types/domain';

export interface ColorPresetChipsProps extends StyleEscapeHatches {
  presets: ColorPreset[];
  selectedColor?: string;
  onSelect: (preset: ColorPreset) => void;
}

/**
 * A fallback for anyone who can't (or doesn't want to) use a precise wheel —
 * every chip carries its own name ("Reading," "Relax") so colour is never
 * the only way to tell presets apart.
 */
export const ColorPresetChips = ({ presets, selectedColor, onSelect, style, containerStyle, testID }: ColorPresetChipsProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'color-preset-chips';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8 }, containerStyle]} style={style} testID={id}>
      {presets.map((preset) => {
        const selected = selectedColor?.toLowerCase() === preset.color.toLowerCase();
        return (
          <TouchableRipple
            key={preset.id}
            onPress={() => onSelect(preset)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${preset.label}${selected ? ', selected' : ''}`}
            style={[styles.chip, { borderRadius: theme.radii.pill, borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant, borderWidth: selected ? 2 : StyleSheet.hairlineWidth }]}
            testID={childTestID(id, preset.id)}
          >
            <View style={styles.row}>
              <View style={[styles.swatch, { backgroundColor: preset.color }]} />
              <Text variant="labelMedium" style={{ marginLeft: 6 }}>
                {preset.label}
              </Text>
              {selected ? <Icon source="check" size={13} color={theme.colors.primary} /> : null}
            </View>
          </TouchableRipple>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 14, height: 14, borderRadius: 7 },
});
