/**
 * USAGE — RestTimerCircle
 *
 * The countdown is always the primary signal — the ring color only shifts to
 * an urgent accent in the final seconds, and the number itself never
 * disappears behind the ring.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RestTimerStatus } from '../types/domain';
import { RestTimerCircle } from './RestTimerCircle';
import rawSample from './RestTimerCircle.sample.json';

const sample = loadSample<Record<'running' | 'urgent' | 'paused' | 'complete', { durationSeconds: number; remainingSeconds: number; status: RestTimerStatus; nextExerciseLabel?: string }>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'running', label: 'Running' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'paused', label: 'Paused' },
  { value: 'complete', label: 'Complete' },
];

export const RestTimerCircleUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('running');
  const [remaining, setRemaining] = useState(sample.running.remainingSeconds);

  useEffect(() => {
    setRemaining(sample[scenario].remainingSeconds);
  }, [scenario]);

  useEffect(() => {
    if (sample[scenario].status !== 'running') return;
    const timer = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(timer);
  }, [scenario]);

  return (
    <View style={{ padding: theme.spacing.md, alignItems: 'center', gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <RestTimerCircle
        durationSeconds={sample[scenario].durationSeconds}
        remainingSeconds={remaining}
        status={sample[scenario].status}
        nextExerciseLabel={sample[scenario].nextExerciseLabel}
        onPause={() => toast.show('Timer paused')}
        onResume={() => toast.show('Timer resumed')}
        onSkip={() => toast.show('Rest skipped')}
        onAddTime={(seconds) => toast.show(`Added ${seconds} seconds`)}
      />
    </View>
  );
};
