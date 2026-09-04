import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AchievementUsage,
  DailyRewardUsage,
  GameCardUsage,
  GameControlsOverlayUsage,
  InAppPurchaseCardUsage,
  LeaderboardUsage,
  MatchmakingDialogUsage,
  PlayerProfileCardUsage,
  ResourcePillUsage,
  ScoreAndTimerUsage,
  SpinWheelWidgetUsage,
  TournamentCardUsage,
} from '@ui/gaming';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'game-card', title: 'GameCard', description: 'ProgressBar for known downloads, ActivityIndicator only when truly indeterminate', Component: GameCardUsage },
  { key: 'leaderboard', title: 'Leaderboard + Podium', description: 'Rank and score are always plain text, never height-only', Component: LeaderboardUsage },
  { key: 'profile', title: 'PlayerProfileCard', description: 'Numeric XP beside the bar; level is never implied as skill', Component: PlayerProfileCardUsage },
  { key: 'achievements', title: 'AchievementBadge + Grid', description: 'Hidden achievements never leak a title; rarity pairs with text', Component: AchievementUsage },
  { key: 'matchmaking', title: 'MatchmakingDialog', description: 'A calm state-machine dialog, no client-owned sockets', Component: MatchmakingDialogUsage },
  { key: 'resources', title: 'LivesEnergyBar + CurrencyPill', description: 'Server-timestamp regeneration, never a locally granted balance', Component: ResourcePillUsage },
  { key: 'rewards', title: 'RewardClaimDialog + Streak', description: 'Claims stay pending until the backend confirms; no shame copy', Component: DailyRewardUsage },
  { key: 'iap', title: 'InAppPurchaseCard', description: 'No entitlement shown before server-side receipt validation', Component: InAppPurchaseCardUsage },
  { key: 'controls', title: 'GameControlsOverlay', description: 'Every icon button carries a real accessibility label', Component: GameControlsOverlayUsage },
  { key: 'score-timer', title: 'ScoreCounter + CountdownTimer', description: 'Server-anchored countdown, meaningful-interval announcements', Component: ScoreAndTimerUsage },
  { key: 'tournament', title: 'TournamentCard', description: 'Eligibility and prize cost shown before Join is ever enabled', Component: TournamentCardUsage },
  { key: 'spin', title: 'SpinWheelWidget', description: 'Visualizes a server-picked outcome; never decides its own winner', Component: SpinWheelWidgetUsage },
];

export const GamingScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((item) => item.key === active), [active]);

  if (entry) {
    const { Component } = entry;
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { padding: theme.spacing.md, backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.flex}>
            {entry.title}
          </Text>
          <Text
            variant="labelLarge"
            onPress={() => setActive(null)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Back
          </Text>
        </View>
        <Component />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <StateView
        preset="success"
        compact
        title="Gaming library"
        description="12 components, each with a sample JSON payload and a compiling usage example."
      />

      <AppCard variant="outlined" padded={false}>
        {ENTRIES.map((item, index) => (
          <List.Item
            key={item.key}
            title={item.title}
            description={item.description}
            descriptionNumberOfLines={2}
            onPress={() => setActive(item.key)}
            left={() => (
              <View style={[styles.index, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            )}
            right={() => <List.Icon icon="chevron-right" />}
            testID={`gaming-entry-${item.key}`}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
