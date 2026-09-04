/**
 * USAGE — SpinWheelWidget
 *
 * The outcome is decided before the animation starts — `resultReward` is
 * picked here in the usage layer (standing in for the server) and handed to
 * the wheel, which only visualizes the spin to that segment.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { SpinReward, SpinWheelState } from '../types/domain';
import { SpinWheelWidget } from './SpinWheelWidget';
import sample from './SpinWheelWidget.sample.json';

const { rewards, balanceLabel, spinCost, freeSpins, ageRestrictionLabel } = loadSample<{
  rewards: SpinReward[];
  balanceLabel: string;
  spinCost: string;
  freeSpins: number;
  ageRestrictionLabel: string;
}>(sample);

export const SpinWheelWidgetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [state, setState] = useState<SpinWheelState>('ready');
  const [result, setResult] = useState<SpinReward | undefined>(undefined);
  const [spinsLeft, setSpinsLeft] = useState(freeSpins);

  const handleSpin = () => {
    // Stands in for the server picking the outcome before any animation starts.
    const picked = rewards[Math.floor(Math.random() * rewards.length)]!;
    setResult(picked);
    setState('spinning');
    setTimeout(() => setState('result'), 2300);
  };

  const handleClaim = () => {
    setState('claiming');
    setTimeout(() => {
      setState('claimed');
      setSpinsLeft((s) => Math.max(0, s - 1));
      toast.success(`Added ${result?.quantity}× ${result?.label}`);
    }, 700);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <SpinWheelWidget
        rewards={rewards}
        state={state}
        resultReward={result}
        balanceLabel={balanceLabel}
        spinCost={spinCost}
        freeSpins={spinsLeft}
        ageRestrictionLabel={ageRestrictionLabel}
        onSpin={handleSpin}
        onClaim={handleClaim}
        onViewOdds={() => toast.show('Common 40% · Rare 45% · Epic 10% · Legendary 5%')}
      />
    </ScrollView>
  );
};
