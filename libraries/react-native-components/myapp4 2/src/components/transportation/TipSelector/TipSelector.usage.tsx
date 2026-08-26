/**
 * USAGE — TipSelector
 *
 * "No tip" sits in the same row, same size, as the preset amounts — nothing
 * about its styling nudges toward tipping.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import type { Money } from '@ui/primitives/money';

import { loadSample } from '../types/sample';
import type { TipOption } from '../types/domain';
import { TipSelector } from './TipSelector';
import rawSample from './TipSelector.sample.json';

const sample = loadSample<{ options: TipOption[]; minCustom: Money; maxCustom: Money }>(rawSample);

export const TipSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <TipSelector
        options={sample.options}
        selectedId={selectedId}
        currency="INR"
        minCustom={sample.minCustom}
        maxCustom={sample.maxCustom}
        submitting={submitting}
        onSelect={(option) => setSelectedId(option.id)}
        onCustomChange={(amount) => toast.show(`Custom tip: ₹${(amount.minorUnits / 100).toFixed(0)}`)}
        onSubmit={() => {
          setSubmitting(true);
          setTimeout(() => {
            setSubmitting(false);
            toast.success('Thanks for your feedback');
          }, 700);
        }}
      />
    </ScrollView>
  );
};
