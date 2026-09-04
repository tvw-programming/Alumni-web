/**
 * USAGE — FareBreakdownAccordion
 *
 * The resort fee and service fee lines are the only ones with an info icon —
 * tapping toggles a plain-language explanation instead of leaving the fee
 * unexplained until after payment.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { FareBreakdown } from '../types/domain';
import { FareBreakdownAccordion } from './FareBreakdownAccordion';
import rawSample from './FareBreakdownAccordion.sample.json';

const sample = loadSample<Record<'estimated' | 'final' | 'changed' | 'calculating', FareBreakdown>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'estimated', label: 'Estimated' },
  { value: 'final', label: 'Final' },
  { value: 'changed', label: 'Changed' },
  { value: 'calculating', label: 'Calculating' },
];

export const FareBreakdownAccordionUsage = () => {
  const theme = useAppTheme();
  const [scenario, setScenario] = useState<keyof typeof sample>('estimated');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={scenario}
        onValueChange={(v) => setScenario(v as keyof typeof sample)}
        buttons={SCENARIOS.map((s) => ({ value: s.value, label: s.label }))}
      />
      <View style={{ borderWidth: 1, borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <FareBreakdownAccordion breakdown={sample[scenario]} defaultExpanded={scenario !== 'estimated'} />
      </View>
    </ScrollView>
  );
};
