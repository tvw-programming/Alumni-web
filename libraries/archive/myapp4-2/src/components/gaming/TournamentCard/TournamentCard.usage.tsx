/**
 * USAGE — TournamentCard
 *
 * "Rookie Rumble" is full — Join becomes disabled and says "Full" rather
 * than silently doing nothing on tap.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Tournament } from '../types/domain';
import { TournamentCard } from './TournamentCard';
import sample from './TournamentCard.sample.json';

const { tournaments } = loadSample<{ tournaments: Tournament[] }>(sample);

export const TournamentCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {tournaments.map((tournament) => (
        <TournamentCard
          key={tournament.id}
          tournament={tournament}
          onJoin={(item) => toast.success(`Registered for ${item.title}`)}
          onViewBracket={(item) => toast.show(`Opening bracket for ${item.title}`)}
          onViewRules={(item) => toast.show(`Opening rules for ${item.title}`)}
        />
      ))}
    </ScrollView>
  );
};
