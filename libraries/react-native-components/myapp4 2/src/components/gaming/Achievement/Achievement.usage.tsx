/**
 * USAGE — AchievementBadge + AchievementGrid
 *
 * The hidden achievement never leaks its real title in the badge or the
 * accessible label — both say "Hidden achievement" until it's actually
 * earned.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Achievement } from '../types/domain';
import { AchievementGrid } from './AchievementGrid';
import sample from './Achievement.sample.json';

const { achievements } = loadSample<{ achievements: Achievement[] }>(sample);

export const AchievementUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <AchievementGrid achievements={achievements} onPressAchievement={(item) => toast.show(item.status === 'hidden' ? 'Keep playing to reveal this achievement' : `Opening ${item.title}`)} />
    </ScrollView>
  );
};
