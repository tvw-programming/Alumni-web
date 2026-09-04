import React, { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import type { LeaderboardEntry, LeaderboardScope } from '../types/domain';
import { LeaderboardPodium } from './LeaderboardPodium';
import { LeaderboardRow } from './LeaderboardRow';

const SCOPE_LABEL: Record<LeaderboardScope, string> = {
  global: 'Global',
  friends: 'Friends',
  clan: 'Clan',
  season: 'Season',
};

export interface LeaderboardProps extends StyleEscapeHatches {
  entries: LeaderboardEntry[];
  scope: LeaderboardScope;
  seasonEndsLabel?: string;
  loading?: boolean;
  currentPlayerUnranked?: boolean;
  onPlayerPress?: (playerId: string) => void;
}

/**
 * The top three render once in `LeaderboardPodium`, and the full ranked list
 * (including that same top three, as plain rows) renders below — a single
 * score change reflows one row, never the whole list.
 */
export const Leaderboard = ({ entries, scope, seasonEndsLabel, loading = false, currentPlayerUnranked = false, onPlayerPress, style, containerStyle, testID }: LeaderboardProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'leaderboard';
  const topThree = useMemo(() => entries.filter((e) => e.rank <= 3).sort((a, b) => a.rank - b.rank), [entries]);

  if (loading) {
    return (
      <View style={[containerStyle, style]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={6} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <Chip compact mode="flat">
          {SCOPE_LABEL[scope]}
        </Chip>
        {seasonEndsLabel ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Season ends in {seasonEndsLabel}
          </Text>
        ) : null}
      </View>

      {topThree.length === 3 ? <LeaderboardPodium topThree={topThree} onPress={onPlayerPress} containerStyle={{ marginVertical: theme.spacing.md }} /> : null}

      <FlatList
        data={entries}
        keyExtractor={(entry) => entry.playerId}
        scrollEnabled={false}
        renderItem={({ item }) => <LeaderboardRow entry={item} onPress={onPlayerPress} />}
        ItemSeparatorComponent={() => <View style={{ height: 4 }} />}
      />

      {currentPlayerUnranked ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
          You haven't placed on this leaderboard yet. Play a match to get ranked.
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
