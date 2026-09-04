/**
 * USAGE — LiveTrackingCard
 *
 * "ended" intentionally drops the provider location entirely — nothing about
 * where the provider is now survives past trip completion.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LiveTrackingData } from '../types/domain';
import { LiveTrackingCard } from './LiveTrackingCard';
import rawSample from './LiveTrackingCard.sample.json';

const sample = loadSample<Record<'live' | 'pending' | 'stale' | 'routeChanged' | 'ended', LiveTrackingData>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'live', label: 'Live' },
  { value: 'pending', label: 'Pending' },
  { value: 'stale', label: 'Stale' },
  { value: 'routeChanged', label: 'Route changed' },
  { value: 'ended', label: 'Ended' },
];

export const LiveTrackingCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('live');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <SegmentedButtons
        value={scenario}
        onValueChange={(v) => setScenario(v as keyof typeof sample)}
        buttons={SCENARIOS.map((s) => ({ value: s.value, label: s.label }))}
      />
      <LiveTrackingCard
        data={sample[scenario]}
        onCall={() => toast.show('Calling via masked number…')}
        onChat={() => toast.show('Opening chat')}
        onOpenFullMap={() => toast.show('Opening full-screen map')}
      />
    </ScrollView>
  );
};
