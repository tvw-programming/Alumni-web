/**
 * USAGE — PlayerProfileCard
 *
 * XP always shows the numeric "2,400 / 3,000 XP" alongside the bar, and the
 * hidden profile renders a private-profile message instead of empty fields.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PlayerProfile } from '../types/domain';
import { PlayerProfileCard } from './PlayerProfileCard';
import sample from './PlayerProfileCard.sample.json';

const { players } = loadSample<{ players: PlayerProfile[] }>(sample);

export const PlayerProfileCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {players.map((player, index) => (
        <PlayerProfileCard
          key={player.id}
          player={player}
          variant={index === 0 ? 'featured' : 'standard'}
          onPress={(item) => toast.show(`Opening ${item.displayName}'s profile`)}
          onRelationshipAction={(item) => toast.show(`${item.relationship === 'none' ? 'Friend request sent to' : 'Opening'} ${item.displayName}`)}
        />
      ))}
    </ScrollView>
  );
};
