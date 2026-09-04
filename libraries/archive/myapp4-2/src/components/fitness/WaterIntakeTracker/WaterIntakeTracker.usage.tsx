/**
 * USAGE — WaterIntakeTracker
 *
 * The glass row backs up the fill colour with icon shape too (outline vs
 * filled cup), and every add announces the new total via toast rather than
 * a silent state change.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { WaterIntakeTracker } from './WaterIntakeTracker';
import sample from './WaterIntakeTracker.sample.json';

const initial = loadSample<{ consumedMl: number; goalMl: number; quickAmountsMl: number[] }>(sample);

export const WaterIntakeTrackerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [consumed, setConsumed] = useState(initial.consumedMl);
  const [lastAdd, setLastAdd] = useState<number | null>(null);

  const handleAdd = (amountMl: number) => {
    setConsumed((prev) => prev + amountMl);
    setLastAdd(amountMl);
    toast.success(`${amountMl} milliliters added`);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <WaterIntakeTracker
        consumedMl={consumed}
        goalMl={initial.goalMl}
        quickAmountsMl={initial.quickAmountsMl}
        onAdd={handleAdd}
        onSetCustomAmount={handleAdd}
        onUndo={
          lastAdd
            ? () => {
                setConsumed((prev) => Math.max(0, prev - lastAdd));
                setLastAdd(null);
                toast.show('Entry removed');
              }
            : undefined
        }
      />
    </ScrollView>
  );
};
