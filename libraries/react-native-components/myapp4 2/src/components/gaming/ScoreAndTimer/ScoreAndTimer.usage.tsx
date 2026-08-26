/**
 * USAGE — ScoreCounter + CountdownTimer
 *
 * The timer computes remaining time from `endsAt` every tick — it never
 * counts down a locally stored number, so backgrounding the app can't make
 * time run out early or stall.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { CountdownTimer } from './CountdownTimer';
import { ScoreCounter } from './ScoreCounter';
import sample from './ScoreAndTimer.sample.json';

const data = loadSample<{
  score: number;
  delta: number;
  isPersonalBest: boolean;
  timerRunning: { endsAt: string; status: 'running' };
  timerCritical: { endsAt: string; status: 'critical' };
  timerPaused: { endsAt: string; status: 'paused' };
  timerExpired: { endsAt: string; status: 'expired' };
}>(sample);

export const ScoreAndTimerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <ScoreCounter value={data.score} delta={data.delta} isPersonalBest={data.isPersonalBest} onMilestone={() => toast.success('New personal best!')} />

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="titleSmall">Running</Text>
        <CountdownTimer endsAt={data.timerRunning.endsAt} status={data.timerRunning.status} onComplete={() => toast.show("Time's up")} />
        <Text variant="titleSmall">Critical</Text>
        <CountdownTimer endsAt={data.timerCritical.endsAt} status={data.timerCritical.status} />
        <Text variant="titleSmall">Paused</Text>
        <CountdownTimer endsAt={data.timerPaused.endsAt} status={data.timerPaused.status} />
        <Text variant="titleSmall">Expired</Text>
        <CountdownTimer endsAt={data.timerExpired.endsAt} status={data.timerExpired.status} />
      </View>
    </ScrollView>
  );
};
