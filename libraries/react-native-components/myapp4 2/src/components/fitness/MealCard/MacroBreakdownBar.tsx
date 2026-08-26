import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ProgressBar, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { MacroKey, MacroValue } from '../types/domain';

const MACRO_LABEL: Record<MacroKey, string> = { protein: 'Protein', carbs: 'Carbs', fat: 'Fat' };
const MACRO_COLOR_KEY: Record<MacroKey, 'macroProtein' | 'macroCarbs' | 'macroFat'> = { protein: 'macroProtein', carbs: 'macroCarbs', fat: 'macroFat' };

export interface MacroBreakdownBarProps extends StyleEscapeHatches {
  macros: MacroValue[];
}

/**
 * Three aligned bars, each with its own label and exact gram value — colour
 * alone (a red/green/blue split) never has to carry protein-vs-carbs-vs-fat
 * meaning on its own.
 */
export const MacroBreakdownBar = ({ macros, style, containerStyle, testID }: MacroBreakdownBarProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'macro-breakdown-bar';

  return (
    <View style={[{ gap: 6 }, containerStyle, style]} testID={id}>
      {macros.map((macro) => {
        const ratio = macro.goalGrams ? Math.min(1, macro.grams / macro.goalGrams) : undefined;
        const over = macro.goalGrams != null && macro.grams > macro.goalGrams;
        return (
          <View key={macro.key} style={{ gap: 2 }} testID={childTestID(id, macro.key)}>
            <View style={styles.row}>
              <Text variant="labelMedium" style={styles.flex}>
                {MACRO_LABEL[macro.key]}
              </Text>
              <Text variant="labelSmall" style={{ color: over ? wellness.colors.warning : wellness.colors.onSurfaceVariant }}>
                {macro.grams}g{macro.goalGrams ? ` / ${macro.goalGrams}g` : ''}
                {over ? ' · Over goal' : ''}
              </Text>
            </View>
            {ratio != null ? (
              <ProgressBar
                progress={ratio}
                color={wellness.colors[MACRO_COLOR_KEY[macro.key]]}
                style={{ height: 6, borderRadius: theme.radii.pill, backgroundColor: wellness.colors.surfaceVariant }}
                accessibilityLabel={`${MACRO_LABEL[macro.key]}: ${macro.grams} of ${macro.goalGrams} grams`}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
