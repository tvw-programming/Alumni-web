/**
 * USAGE — OTPDisplayCard
 *
 * The code stays hidden until the rider taps "reveal" — it's never rendered
 * in the tree (and so never screen-reader-announced) on mount.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { OTPState } from '../types/domain';
import { OTPDisplayCard } from './OTPDisplayCard';
import rawSample from './OTPDisplayCard.sample.json';

const sample = loadSample<Record<'active' | 'verified' | 'expired' | 'failed', OTPState>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'verified', label: 'Verified' },
  { value: 'expired', label: 'Expired' },
  { value: 'failed', label: 'Failed' },
];

export const OTPDisplayCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('active');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <OTPDisplayCard
        key={scenario}
        otp={sample[scenario]}
        onReveal={() => toast.show('Code revealed')}
        onCopy={(code) => toast.success(`Code ${code} copied`)}
        onHelp={() => toast.show('Opening help')}
      />
    </ScrollView>
  );
};
