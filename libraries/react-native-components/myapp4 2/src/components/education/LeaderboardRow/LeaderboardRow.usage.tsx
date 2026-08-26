/**
 * USAGE — LeaderboardRow
 *
 * Includes the cases that get skipped in most demos: a tie, an anonymous entry,
 * an opted-out learner, and a private mode that hides the board entirely for
 * people who find competition demotivating.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Switch, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LeaderboardEntry } from '../types/domain';
import { LeaderboardHeader, LeaderboardRow } from './LeaderboardRow';
import sample from './LeaderboardRow.sample.json';

const data = loadSample<{
  title: string;
  periodNote: string;
  pointsLabel: string;
  entries: LeaderboardEntry[];
  boundaries: { promotionAfterRank: number; demotionBeforeRank: number };
  unranked: { note: string };
}>(sample);

export const LeaderboardRowUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [privateMode, setPrivateMode] = useState(false);
  const [unranked, setUnranked] = useState(false);
  const [loading, setLoading] = useState(false);

  const me = useMemo(() => data.entries.find((entry) => entry.isCurrentUser), []);
  const above = useMemo(() => {
    if (!me) return null;
    const next = data.entries.find((entry) => entry.rank === me.rank - 1);
    return next ? next.points - me.points : null;
  }, [me]);

  if (privateMode) {
    return (
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Private mode (no leaderboard)
          </Text>
          <Switch value={privateMode} onValueChange={setPrivateMode} accessibilityLabel="Private mode" />
        </View>
        <StateView
          preset="success"
          title="Leaderboards are off"
          description="Your progress is still tracked, and course completion never depends on ranking. You can turn leaderboards back on any time."
          testID="leaderboard-private"
        />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Private mode (no leaderboard)
          </Text>
          <Switch value={privateMode} onValueChange={setPrivateMode} accessibilityLabel="Private mode" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Simulate not yet ranked
          </Text>
          <Switch value={unranked} onValueChange={setUnranked} accessibilityLabel="Not yet ranked" />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm }}>
          <Text variant="labelMedium" style={{ flex: 1 }}>
            Loading
          </Text>
          <Switch value={loading} onValueChange={setLoading} accessibilityLabel="Loading state" />
        </View>
      </View>

      <LeaderboardHeader
        title={data.title}
        periodNote={data.periodNote}
        unrankedNote={
          unranked
            ? data.unranked.note
            : above != null
              ? `You're in ${me?.rank}th place · ${above} ${data.pointsLabel} to move up`
              : undefined
        }
        onOpenPrivacy={() => toast.show('Opening leaderboard privacy settings')}
        testID="leaderboard-header"
      />

      <AppCard variant="outlined" padded={false} containerStyle={{ marginHorizontal: theme.spacing.md }}>
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <LeaderboardRow
                key={index}
                entry={{ userId: `s-${index}`, rank: index + 1, displayName: '', points: 0 }}
                loading
              />
            ))
          : data.entries.map((entry, index) => (
              <View key={entry.userId}>
                <LeaderboardRow
                  entry={entry}
                  pointsLabel={data.pointsLabel}
                  index={index}
                  entering="slideUp"
                  onPress={(item) => toast.show(`${item.displayName}'s profile`)}
                  boundary={
                    entry.rank === data.boundaries.promotionAfterRank + 1
                      ? { label: 'Promotion zone above', kind: 'promotion' }
                      : entry.rank === data.boundaries.demotionBeforeRank
                        ? { label: 'Demotion zone below', kind: 'demotion' }
                        : undefined
                  }
                />
                {index < data.entries.length - 1 ? <Divider /> : null}
              </View>
            ))}
      </AppCard>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, padding: theme.spacing.md }}>
        XP is earned by completing lessons and quizzes. Rank reflects XP earned this week — it does not measure ability,
        and nothing in a course requires a ranking.
      </Text>
    </ScrollView>
  );
};
