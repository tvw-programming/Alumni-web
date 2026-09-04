/**
 * USAGE — RewardClaimDialog + DailyStreakCalendar
 *
 * Day 3 is "missed," not "failed" — the calendar keeps the historical streak
 * legible rather than resetting to zero with no record of what happened.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RewardClaimStatus, RewardContents, RewardDay } from '../types/domain';
import { DailyStreakCalendar } from './DailyStreakCalendar';
import { RewardClaimDialog } from './RewardClaimDialog';
import sample from './DailyReward.sample.json';

const { days, streakCount, claimReward } = loadSample<{ days: RewardDay[]; streakCount: number; claimReward: RewardContents }>(sample);

export const DailyRewardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState<RewardClaimStatus>('available');

  const handleClaim = () => {
    setStatus('claiming');
    setTimeout(() => setStatus('claimed'), 900);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <DailyStreakCalendar
        days={days}
        streakCount={streakCount}
        onSelectDay={(day) => {
          if (day.status === 'available') {
            setStatus('available');
            setVisible(true);
          } else {
            toast.show(`Day ${day.day}: ${day.status}`);
          }
        }}
      />

      <AppButton variant="primary" onPress={() => { setStatus('available'); setVisible(true); }}>
        Open today's reward
      </AppButton>

      <RewardClaimDialog
        visible={visible}
        reward={claimReward}
        status={status}
        onClaim={handleClaim}
        onDismiss={() => setVisible(false)}
      />
    </ScrollView>
  );
};
