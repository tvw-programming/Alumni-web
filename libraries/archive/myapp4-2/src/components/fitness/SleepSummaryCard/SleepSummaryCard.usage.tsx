/**
 * USAGE — SleepSummaryCard
 *
 * The score renders as a plain number labelled "Sleep score" — never a
 * red/green judgement — and stage data only appears when it's real, falling
 * back to "unavailable" text rather than a fabricated bar.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { SleepSummary } from '../types/domain';
import { SleepSummaryCard } from './SleepSummaryCard';
import rawSample from './SleepSummaryCard.sample.json';

const sample = loadSample<Record<'available' | 'partial' | 'missing' | 'syncing', SleepSummary>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'available', label: 'Available' },
  { value: 'partial', label: 'Partial' },
  { value: 'missing', label: 'Missing' },
  { value: 'syncing', label: 'Syncing' },
];

export const SleepSummaryCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('available');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <SleepSummaryCard summary={sample[scenario]} onPressDetails={() => toast.show('Opening sleep details')} />
    </ScrollView>
  );
};
