import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  CastCrewStripUsage,
  ContentCarouselUsage,
  ContentPosterCardUsage,
  ContinueWatchingCardUsage,
  DownloadStatusButtonUsage,
  EpisodeListItemUsage,
  HeroBannerUsage,
  MiniPlayerBarUsage,
  PlayerControlsOverlayUsage,
  SeasonSelectorUsage,
  SubscriptionPlanCardUsage,
  WatchlistAndRatingUsage,
} from '@ui/media';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'poster', title: 'ContentPosterCard', description: 'Portrait/landscape artwork; restricted titles stay visible with a reason', Component: ContentPosterCardUsage },
  { key: 'hero', title: 'HeroBanner', description: 'One item, explicit state; paging lives in a separate controller', Component: HeroBannerUsage },
  { key: 'carousel', title: 'ContentCarousel', description: 'A fully generic rail — never knows what its children are', Component: ContentCarouselUsage },
  { key: 'continue', title: 'ContinueWatchingCard', description: 'Progress bar always paired with real "Watched X of Y min" text', Component: ContinueWatchingCardUsage },
  { key: 'player', title: 'PlayerControlsOverlay', description: 'Renders state and emits intent; never owns buffering or DRM', Component: PlayerControlsOverlayUsage },
  { key: 'episode', title: 'EpisodeListItem', description: 'Play and Download are always separate tap targets', Component: EpisodeListItemUsage },
  { key: 'season', title: 'SeasonSelector', description: 'One selection model, two renderers — menu and segmented', Component: SeasonSelectorUsage },
  { key: 'download', title: 'DownloadStatusButton', description: 'Idempotent — dispatches intent, renders durable manager state', Component: DownloadStatusButtonUsage },
  { key: 'watchlist', title: 'WatchlistToggle + MaturityRatingChip', description: 'Saved and restricted states never rely on colour alone', Component: WatchlistAndRatingUsage },
  { key: 'cast', title: 'CastCrewStrip', description: 'Missing headshots fall back to initials, never a blank tile', Component: CastCrewStripUsage },
  { key: 'plans', title: 'SubscriptionPlanCard', description: '"Free" trials always disclose when billing begins', Component: SubscriptionPlanCardUsage },
  { key: 'mini-player', title: 'MiniPlayerBar', description: 'A compact bar, never the only route to full playback controls', Component: MiniPlayerBarUsage },
];

export const MediaScreen = () => {
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
        title="Media & OTT library"
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
            testID={`media-entry-${item.key}`}
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
