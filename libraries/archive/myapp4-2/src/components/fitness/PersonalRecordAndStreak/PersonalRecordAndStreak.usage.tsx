/**
 * USAGE — PersonalRecordCard + StreakFlame
 *
 * The "broken" streak still shows "Longest streak: 21 days" — the historical
 * best is never erased just because the current streak reset to 0.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PersonalRecord, StreakStatus } from '../types/domain';
import { PersonalRecordCard } from './PersonalRecordCard';
import { StreakFlame } from './StreakFlame';
import sample from './PersonalRecordAndStreak.sample.json';

const data = loadSample<{
  records: PersonalRecord[];
  streaks: Record<'active' | 'protected' | 'broken', { currentDays: number; longestDays: number; status: StreakStatus; milestoneLabel?: string }>;
}>(sample);

export const PersonalRecordAndStreakUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View style={{ gap: theme.spacing.md }}>
        {data.records.map((record) => (
          <PersonalRecordCard key={record.id} record={record} onViewHistory={(item) => toast.show(`Opening history for ${item.label}`)} />
        ))}
      </View>

      <View style={{ gap: theme.spacing.md }}>
        <Text variant="titleSmall">Streak states</Text>
        {(Object.keys(data.streaks) as (keyof typeof data.streaks)[]).map((key) => (
          <StreakFlame key={key} {...data.streaks[key]} onPress={() => toast.show('Opening streak calendar')} />
        ))}
      </View>
    </ScrollView>
  );
};
