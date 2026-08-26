/**
 * USAGE — Leaderboard
 *
 * "You" is highlighted through both a background fill and the literal word
 * "You" — never background colour alone — and the under-review player still
 * shows a real rank and score alongside the flag.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LeaderboardEntry } from '../types/domain';
import { Leaderboard } from './Leaderboard';
import sample from './Leaderboard.sample.json';

const { entries, seasonEndsLabel } = loadSample<{ entries: LeaderboardEntry[]; seasonEndsLabel: string }>(sample);

export const LeaderboardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <Leaderboard entries={entries} scope="season" seasonEndsLabel={seasonEndsLabel} onPlayerPress={(playerId) => toast.show(`Opening profile ${playerId}`)} />
    </ScrollView>
  );
};
