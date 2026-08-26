/**
 * USAGE — ContentCarousel
 *
 * The empty personalized rail ("Because you watched…") renders a real empty
 * state instead of collapsing to nothing — the section title stays visible
 * so the row's absence is explained, not silently missing.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ContentPoster } from '../types/domain';
import { ContentPosterCard } from '../ContentPosterCard/ContentPosterCard';
import { ContentCarousel } from './ContentCarousel';
import sample from './ContentCarousel.sample.json';

const data = loadSample<{ trending: { title: string; items: ContentPoster[] }; becauseYouWatched: { title: string; items: ContentPoster[] } }>(sample);

const CARD_WIDTH = 130;

export const ContentCarouselUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.md, backgroundColor: '#0B0B0F', gap: theme.spacing.lg }}>
      <ContentCarousel
        title={data.trending.title}
        items={data.trending.items}
        cardWidth={CARD_WIDTH}
        keyExtractor={(item) => item.id}
        containerStyle={{ paddingHorizontal: theme.spacing.md }}
        onSeeAll={() => toast.show(`Opening all: ${data.trending.title}`)}
        renderItem={({ item }) => (
          <ContentPosterCard content={item} containerStyle={{ width: CARD_WIDTH }} onPress={(poster) => toast.show(`Opening ${poster.title}`)} />
        )}
      />

      <ContentCarousel
        title={data.becauseYouWatched.title}
        items={data.becauseYouWatched.items}
        cardWidth={CARD_WIDTH}
        keyExtractor={(item) => item.id}
        containerStyle={{ paddingHorizontal: theme.spacing.md }}
        emptyMessage="Watch a few more titles to see personalized picks here."
        renderItem={({ item }) => <ContentPosterCard content={item} containerStyle={{ width: CARD_WIDTH }} onPress={(poster) => toast.show(`Opening ${poster.title}`)} />}
      />

      <ContentCarousel
        title="Loading example"
        items={[]}
        loading
        cardWidth={CARD_WIDTH}
        keyExtractor={(item: ContentPoster) => item.id}
        containerStyle={{ paddingHorizontal: theme.spacing.md }}
        renderItem={({ item }) => <ContentPosterCard content={item} containerStyle={{ width: CARD_WIDTH }} onPress={() => {}} />}
      />
    </ScrollView>
  );
};
