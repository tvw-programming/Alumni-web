/**
 * USAGE — GameCard
 *
 * "Shattered Keep" mid-install shows a real `ProgressBar` percentage;
 * "Puzzle Meadows" shows a failed-download state with a retry action instead
 * of silently staying stuck at 0%.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { GameCardData } from '../types/domain';
import { GameCard } from './GameCard';
import sample from './GameCard.sample.json';

const { games } = loadSample<{ games: GameCardData[] }>(sample);

export const GameCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [wishlist, setWishlist] = useState<string[]>(['g-2']);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {games.map((game) => (
          <View key={game.id} style={{ width: '47%' }}>
            <GameCard
              game={{ ...game, wishlisted: wishlist.includes(game.id) }}
              onPrimaryAction={(item) => toast.show(`${item.primaryAction === 'install' ? 'Installing' : item.primaryAction} ${item.title}`)}
              onOpen={(item) => toast.show(`Opening ${item.title}`)}
              onWishlist={(item, next) => setWishlist((prev) => (next ? [...prev, item.id] : prev.filter((id) => id !== item.id)))}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
