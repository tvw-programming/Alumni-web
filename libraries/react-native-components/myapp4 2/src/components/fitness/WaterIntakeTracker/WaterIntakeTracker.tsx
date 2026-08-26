import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text, TextInput, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';

export interface WaterIntakeTrackerProps extends StyleEscapeHatches {
  consumedMl: number;
  goalMl: number;
  quickAmountsMl?: number[];
  unit?: 'ml' | 'oz';
  loading?: boolean;
  onAdd: (amountMl: number) => void;
  onUndo?: () => void;
  onSetCustomAmount?: (amountMl: number) => void;
}

const MLPEROZ = 29.5735;
const formatAmount = (ml: number, unit: 'ml' | 'oz') => (unit === 'oz' ? `${(ml / MLPEROZ).toFixed(1)} oz` : `${(ml / 1000).toFixed(ml % 1000 === 0 ? 0 : 2)} L`);

/**
 * Every fill state pairs a droplet icon with a number — colour is never the
 * only signal a glass has been logged. Taps are idempotent from the caller's
 * point of view: each tap emits one `onAdd(amountMl)` intent and the
 * component trusts whatever total it's re-rendered with next.
 */
export const WaterIntakeTracker = ({ consumedMl, goalMl, quickAmountsMl = [150, 250, 500], unit = 'ml', loading = false, onAdd, onUndo, onSetCustomAmount, style, containerStyle, testID }: WaterIntakeTrackerProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'water-intake-tracker';
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  const progress = goalMl > 0 ? Math.min(1, consumedMl / goalMl) : 0;
  const goalMet = consumedMl >= goalMl;
  const glassCount = 8;
  const filledGlasses = Math.min(glassCount, Math.round((consumedMl / goalMl) * glassCount));

  const submitCustom = () => {
    const value = Number(customText);
    if (!Number.isNaN(value) && value > 0) {
      onSetCustomAmount?.(unit === 'oz' ? Math.round(value * MLPEROZ) : Math.round(value));
    }
    setCustomText('');
    setCustomOpen(false);
  };

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <Text variant="titleSmall" style={styles.flex}>
            Water
          </Text>
          <Text variant="labelMedium" style={{ color: goalMet ? wellness.colors.success : wellness.colors.onSurfaceVariant }}>
            {formatAmount(consumedMl, unit)} / {formatAmount(goalMl, unit)}
          </Text>
        </View>

        <ProgressBar
          progress={loading ? 0 : progress}
          color={goalMet ? wellness.colors.success : wellness.colors.focus}
          style={{ height: 6, borderRadius: theme.radii.pill, backgroundColor: wellness.colors.surfaceVariant }}
          accessibilityLabel={`${formatAmount(consumedMl, unit)} of ${formatAmount(goalMl, unit)} daily water goal`}
        />

        {goalMet ? (
          <View style={styles.row}>
            <Icon source="check-circle" size={14} color={wellness.colors.success} />
            <Text variant="labelSmall" style={{ color: wellness.colors.success, marginLeft: 4 }}>
              Daily goal complete
            </Text>
          </View>
        ) : null}

        <View style={styles.glassRow} accessibilityRole="text" accessibilityLabel={`${filledGlasses} of ${glassCount} glasses`}>
          {Array.from({ length: glassCount }).map((_, index) => (
            <Icon
              key={index}
              source={index < filledGlasses ? 'cup-water' : 'cup-outline'}
              size={20}
              color={index < filledGlasses ? wellness.colors.focus : wellness.colors.onSurfaceVariant}
            />
          ))}
        </View>

        <View style={[styles.row, { gap: theme.spacing.sm, flexWrap: 'wrap' }]}>
          {quickAmountsMl.map((amount) => (
            <TouchableRipple
              key={amount}
              onPress={() => onAdd(amount)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${formatAmount(amount, unit)}`}
              style={[styles.quickChip, { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.pill }]}
              testID={childTestID(id, `add-${amount}`)}
            >
              <Text variant="labelMedium">+{formatAmount(amount, unit)}</Text>
            </TouchableRipple>
          ))}
          <TouchableRipple onPress={() => setCustomOpen(true)} accessibilityRole="button" accessibilityLabel="Custom amount" style={[styles.quickChip, { borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.pill }]} testID={childTestID(id, 'custom')}>
            <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
              Custom
            </Text>
          </TouchableRipple>
        </View>

        {onUndo ? (
          <AppButton variant="ghost" size="sm" onPress={onUndo} testID={childTestID(id, 'undo')}>
            Undo
          </AppButton>
        ) : null}
      </View>

      <AppSheet visible={customOpen} onDismiss={() => setCustomOpen(false)} variant="center" scrollable={false} title="Custom amount" testID={childTestID(id, 'custom-sheet')}>
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.sm }}>
          <TextInput mode="outlined" label={`Amount (${unit})`} keyboardType="decimal-pad" value={customText} onChangeText={setCustomText} autoFocus />
          <AppButton variant="primary" size="lg" fullWidth onPress={submitCustom} testID={childTestID(id, 'custom-submit')}>
            Add
          </AppButton>
        </View>
      </AppSheet>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  glassRow: { flexDirection: 'row', gap: 4 },
  quickChip: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingVertical: 6 },
});
