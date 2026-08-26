/**
 * USAGE — EMICalculatorCard
 *
 * "Estimated monthly EMI" and the disclaimer stay visible at all times — the
 * card never implies loan approval from a slider estimate.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { EmiInputs } from '../types/domain';
import { EMICalculatorCard } from './EMICalculatorCard';
import sample from './EMICalculatorCard.sample.json';

const initial = loadSample<{ inputs: EmiInputs }>(sample);

export const EMICalculatorCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [inputs, setInputs] = useState<EmiInputs>(initial.inputs);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <EMICalculatorCard inputs={inputs} onChange={setInputs} showSchedule onApply={() => toast.show('Opening eligibility check')} />
    </ScrollView>
  );
};
