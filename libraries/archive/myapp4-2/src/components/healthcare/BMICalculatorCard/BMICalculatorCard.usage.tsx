/**
 * USAGE — BMICalculatorCard
 *
 * The four presets show why the engine refuses to categorise outside adult
 * screening: a 14-year-old needs percentiles, pregnancy makes BMI meaningless,
 * and without an age we simply do not know which rule applies.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { BMIInput } from '../types/domain';
import { BMICalculatorCard, type BMIHistoryEntry } from './BMICalculatorCard';
import { calculateBMI } from './bmiEngine';
import sample from './BMICalculatorCard.sample.json';

const data = loadSample<{ cases: Record<string, BMIInput>; history: BMIHistoryEntry[] }>(sample);
type CaseKey = 'adultMetric' | 'adultImperial' | 'teenager' | 'pregnant' | 'unknownAge';

export const BMICalculatorCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [key, setKey] = useState<CaseKey>('adultMetric');

  /** The engine is pure, so the expected output can be shown alongside. */
  const expected = useMemo(() => calculateBMI(data.cases[key]!), [key]);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={key}
        onValueChange={(next) => setKey(next as CaseKey)}
        density="small"
        buttons={[
          { value: 'adultMetric', label: 'Adult' },
          { value: 'teenager', label: 'Teen' },
          { value: 'pregnant', label: 'Pregnant' },
          { value: 'unknownAge', label: 'No age' },
        ]}
      />

      <BMICalculatorCard
        // Remount so each preset starts clean.
        key={key}
        initial={data.cases[key]}
        history={data.history}
        onCalculate={(result) => toast.show(`BMI ${result.value} · ${result.interpretationMode}`)}
        onSave={(result) => toast.success(`Saved BMI ${result.value.toFixed(1)}`)}
        onViewHistory={() => toast.show('Opening BMI history')}
        onUnitChange={(units) => toast.show(`Units: ${units.weightUnit}/${units.heightUnit}`)}
        testID="bmi"
      />

      <AppCard variant="filled" title="What the pure engine returns">
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
          {JSON.stringify(expected, null, 1)}
        </Text>
      </AppCard>

      <Text variant="labelLarge">Privacy mode (shared or clinical screens)</Text>
      <BMICalculatorCard initial={data.cases.adultMetric} privacyMode compact testID="bmi-private" />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
