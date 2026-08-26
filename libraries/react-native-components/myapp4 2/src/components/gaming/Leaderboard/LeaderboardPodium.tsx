import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { LeaderboardEntry } from '../types/domain';

export interface LeaderboardPodiumProps extends StyleEscapeHatches {
  /** Exactly the top-3 entries, in rank order. */
  topThree: LeaderboardEntry[];
  onPress?: (playerId: string) => void;
}

const MEDAL_ORDER = [1, 0, 2]; // visual order: 2nd, 1st, 3rd

/**
 * Height and medal colour are decoration on top of a rank number that is
 * always rendered as text — a screen reader gets "Rank 1, Aria, 12,400
 * points" regardless of visual height.
 */
export const LeaderboardPodium = ({ topThree, onPress, style, containerStyle, testID }: LeaderboardPodiumProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? 'leaderboard-podium';

  return (
    <View style={[styles.row, containerStyle, style]} testID={id} accessibilityRole="text">
      {MEDAL_ORDER.map((index) => {
        const entry = topThree[index];
        if (!entry) return <View key={index} style={styles.slot} />;
        const height = entry.rank === 1 ? 96 : entry.rank === 2 ? 76 : 60;
        const medalColor = entry.rank === 1 ? gaming.colors.rarityLegendary : entry.rank === 2 ? gaming.colors.rarityCommon : gaming.colors.currencyCoins;

        return (
          <View key={entry.playerId} style={styles.slot}>
            {entry.avatar?.uri ? (
              <Avatar.Image size={entry.rank === 1 ? gaming.layout.podiumAvatarSize : gaming.layout.podiumAvatarSize - 12} source={{ uri: entry.avatar.uri }} />
            ) : (
              <Avatar.Text size={entry.rank === 1 ? gaming.layout.podiumAvatarSize : gaming.layout.podiumAvatarSize - 12} label={initialsOf(entry.displayName)} />
            )}
            <Text variant="labelMedium" numberOfLines={1} style={styles.name}>
              {entry.isCurrentPlayer ? 'You' : entry.displayName}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {entry.scoreLabel}
            </Text>
            <View style={[styles.bar, { height, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.sm }]}>
              <Icon source="medal-outline" size={16} color={medalColor} />
              <Text variant="titleMedium" style={{ color: medalColor }}>
                {entry.rank}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8 },
  slot: { alignItems: 'center', width: 88 },
  name: { marginTop: 6, maxWidth: 88 },
  bar: { width: '100%', marginTop: 8, alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 8, gap: 2 },
});
