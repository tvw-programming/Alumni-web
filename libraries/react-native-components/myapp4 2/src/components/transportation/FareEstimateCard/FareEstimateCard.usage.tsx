/**
 * USAGE — FareEstimateCard
 *
 * The "changed" scenario shows both the old and new amount together — the
 * fare never just silently updates to a bigger number.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { FareEstimate, PaymentMethod } from '../types/domain';
import { FareEstimateCard } from './FareEstimateCard';
import rawSample from './FareEstimateCard.sample.json';

const sample = loadSample<Record<'upfront' | 'changed' | 'estimated' | 'calculating' | 'expired', FareEstimate> & { paymentMethod: PaymentMethod }>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'upfront', label: 'Upfront' },
  { value: 'changed', label: 'Changed' },
  { value: 'estimated', label: 'Range' },
  { value: 'calculating', label: 'Calculating' },
  { value: 'expired', label: 'Expired' },
];

export const FareEstimateCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<'upfront' | 'changed' | 'estimated' | 'calculating' | 'expired'>('upfront');
  const [requesting, setRequesting] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as typeof scenario)} buttons={SCENARIOS} />
      <FareEstimateCard
        estimate={sample[scenario] as FareEstimate}
        pickupLabel="Indiranagar"
        dropoffLabel="Kempegowda International Airport"
        eta="5 min"
        paymentMethod={sample.paymentMethod}
        requesting={requesting}
        onRefresh={() => toast.show('Refreshing fare…')}
        onRequest={() => {
          setRequesting(true);
          setTimeout(() => {
            setRequesting(false);
            toast.success('Ride requested');
          }, 900);
        }}
        onChangePayment={() => toast.show('Opening payment methods')}
      />
    </ScrollView>
  );
};
