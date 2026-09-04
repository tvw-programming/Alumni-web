import React, { useCallback, useMemo, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Icon, SegmentedButtons, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { NotAdviceNotice } from '../primitives/ClinicalSafety';
import { useHealthTheme } from '../theme/healthcareTokens';
import type { BMIInput, BMIResult } from '../types/domain';
import { calculateBMI, validateBMIInput } from './bmiEngine';

export interface BMIHistoryEntry {
  id: string;
  value: number;
  measuredAt: string;
}

export interface BMICalculatorCardProps extends StyleEscapeHatches {
  initial?: Partial<BMIInput>;
  locale?: string;
  onCalculate?: (result: BMIResult, input: BMIInput) => void;
  onSave?: (result: BMIResult, input: BMIInput) => void;
  onUnitChange?: (units: { weightUnit: BMIInput['weightUnit']; heightUnit: BMIInput['heightUnit'] }) => void;
  history?: BMIHistoryEntry[];
  onViewHistory?: () => void;
  /** Hides the numbers until tapped, for shared or clinical screens. */
  privacyMode?: boolean;
  compact?: boolean;
}

/**
 * BMI calculator.
 *
 * The UI never decides clinical meaning: it renders whatever
 * `interpretationMode` the pure engine returns, and for pregnancy, children, or
 * an unknown age that mode is explicitly *not interpretable*. A number without a
 * category is the honest output there — inventing one would be worse than useless.
 */
export const BMICalculatorCard = ({
  initial,
  locale = 'en-IN',
  onCalculate,
  onSave,
  onUnitChange,
  history = [],
  onViewHistory,
  privacyMode = false,
  compact = false,
  style,
  containerStyle,
  testID,
}: BMICalculatorCardProps) => {
  const theme = useAppTheme();
  const health = useHealthTheme();

  const [weight, setWeight] = useState(initial?.weight ? String(initial.weight) : '');
  const [height, setHeight] = useState(initial?.height ? String(initial.height) : '');
  const [weightUnit, setWeightUnit] = useState<BMIInput['weightUnit']>(initial?.weightUnit ?? 'kg');
  const [heightUnit, setHeightUnit] = useState<BMIInput['heightUnit']>(initial?.heightUnit ?? 'cm');
  const [age, setAge] = useState(initial?.age ? String(initial.age) : '');
  const [pregnancy, setPregnancy] = useState<BMIInput['pregnancyStatus']>(initial?.pregnancyStatus ?? 'unknown');
  const [revealed, setRevealed] = useState(!privacyMode);
  const [touched, setTouched] = useState(false);

  const input = useMemo<BMIInput>(
    () => ({
      weight: Number.parseFloat(weight) || 0,
      height: Number.parseFloat(height) || 0,
      weightUnit,
      heightUnit,
      age: age ? Number.parseInt(age, 10) : undefined,
      pregnancyStatus: pregnancy,
    }),
    [age, height, heightUnit, pregnancy, weight, weightUnit],
  );

  const errors = useMemo(() => (touched ? validateBMIInput(input) : []), [input, touched]);
  const result = useMemo(() => calculateBMI(input), [input]);

  const errorFor = useCallback(
    (field: 'weight' | 'height') => errors.find((error) => error.field === field)?.message,
    [errors],
  );

  const handleCalculate = useCallback(() => {
    setTouched(true);
    if (!result) return;
    setRevealed(true);
    // Screen readers get the result spoken, not just a visual change.
    AccessibilityInfo.announceForAccessibility(
      `Your BMI is ${result.value}${result.category ? `, ${result.category}` : ''}. ${result.disclaimer}`,
    );
    onCalculate?.(result, input);
  }, [input, onCalculate, result]);

  const switchUnits = useCallback(
    (nextWeight: BMIInput['weightUnit'], nextHeight: BMIInput['heightUnit']) => {
      setWeightUnit(nextWeight);
      setHeightUnit(nextHeight);
      onUnitChange?.({ weightUnit: nextWeight, heightUnit: nextHeight });
    },
    [onUnitChange],
  );

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={testID}>
      <View style={{ gap: theme.spacing.md }}>
        <Text variant="titleMedium">BMI calculator</Text>

        <SegmentedButtons
          value={weightUnit === 'kg' ? 'metric' : 'imperial'}
          onValueChange={(next) => (next === 'metric' ? switchUnits('kg', 'cm') : switchUnits('lb', 'in'))}
          density="small"
          buttons={[
            { value: 'metric', label: 'Metric (kg, cm)' },
            { value: 'imperial', label: 'Imperial (lb, in)' },
          ]}
        />

        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <View style={styles.flex}>
            <AppTextInput
              label={`Weight (${weightUnit})`}
              value={weight}
              onChangeText={setWeight}
              keyboardType="decimal-pad"
              error={!!errorFor('weight')}
              errorText={errorFor('weight')}
              testID={childTestID(testID, 'weight')}
            />
          </View>
          <View style={styles.flex}>
            <AppTextInput
              label={`Height (${heightUnit})`}
              value={height}
              onChangeText={setHeight}
              keyboardType="decimal-pad"
              error={!!errorFor('height')}
              errorText={errorFor('height')}
              testID={childTestID(testID, 'height')}
            />
          </View>
        </View>

        {!compact ? (
          <View style={[styles.row, { gap: theme.spacing.sm }]}>
            <View style={styles.flex}>
              <AppTextInput
                label="Age (optional)"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                helperText="Interpretation depends on age"
                testID={childTestID(testID, 'age')}
              />
            </View>
            <View style={styles.flex}>
              <SegmentedButtons
                value={pregnancy ?? 'unknown'}
                onValueChange={(next) => setPregnancy(next as BMIInput['pregnancyStatus'])}
                density="small"
                buttons={[
                  { value: 'notPregnant', label: 'Not pregnant' },
                  { value: 'pregnant', label: 'Pregnant' },
                ]}
              />
            </View>
          </View>
        ) : null}

        <AppButton variant="primary" fullWidth onPress={handleCalculate} testID={childTestID(testID, 'calculate')}>
          Calculate
        </AppButton>

        {result && touched ? (
          <View
            style={[
              styles.result,
              { backgroundColor: health.colors.surfaceCalm, borderRadius: theme.radii.md, padding: theme.spacing.md, gap: 4 },
            ]}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`Your BMI is ${result.value}${result.category ? `, ${result.category}` : ''}`}
            testID={childTestID(testID, 'result')}
          >
            <Text variant="labelSmall" style={{ color: health.colors.onSurfaceCalm }}>
              Your BMI
            </Text>

            {revealed ? (
              <Text variant="displaySmall" style={[styles.tabular, { color: health.colors.onSurfaceCalm }]}>
                {result.value.toFixed(1)}
              </Text>
            ) : (
              <Text
                variant="displaySmall"
                onPress={() => setRevealed(true)}
                accessibilityRole="button"
                accessibilityLabel="Show your BMI"
                style={{ color: health.colors.onSurfaceCalm }}
              >
                ••••
              </Text>
            )}

            {/* A category only where adult screening genuinely applies. */}
            {result.interpretationMode === 'adultScreening' && result.category ? (
              <Text variant="titleSmall" style={{ color: health.colors.onSurfaceCalm }}>
                {result.category} range
              </Text>
            ) : (
              <View style={[styles.row, { gap: 4 }]}>
                <Icon source="information-outline" size={14} color={health.colors.rangeReview} />
                <Text variant="labelSmall" style={{ color: health.colors.rangeReview, flex: 1 }}>
                  {result.interpretationMode === 'pediatricPercentile'
                    ? 'Needs a clinician to interpret against age percentiles'
                    : 'We cannot categorise this without more context'}
                </Text>
              </View>
            )}

            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
              {result.disclaimer}
            </Text>

            <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.xs }]}>
              {onSave ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onSave(result, input)}
                  accessibilityRole="button"
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(testID, 'save')}
                >
                  Save this result
                </Text>
              ) : null}
              {onViewHistory && history.length > 0 ? (
                <Text
                  variant="labelSmall"
                  onPress={onViewHistory}
                  accessibilityRole="button"
                  style={{ color: theme.colors.primary }}
                >
                  View history
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {history.length > 0 ? (
          <View style={{ gap: 2 }}>
            <Text variant="labelMedium">Previous results</Text>
            {history.slice(0, 3).map((entry) => (
              <Text key={entry.id} variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {entry.value.toFixed(1)} · {formatRelativeDate(entry.measuredAt, locale)}
              </Text>
            ))}
          </View>
        ) : null}

        <NotAdviceNotice
          text="This calculator is for information only and is not a diagnosis. Talk to your clinician about what it means for you."
          testID={childTestID(testID, 'disclaimer')}
        />
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  result: {},
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
