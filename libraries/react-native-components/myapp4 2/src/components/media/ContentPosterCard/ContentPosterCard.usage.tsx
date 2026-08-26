/**
 * USAGE — ContentPosterCard
 *
 * "Iron Circuit" and "Departed Frontier" both stay visible with an honest
 * overlay explaining why they can't be played — restricted titles are never
 * silently hidden from a browse row.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ContentPoster } from '../types/domain';
import { ContentPosterCard } from './ContentPosterCard';
import sample from './ContentPosterCard.sample.json';

const { posters } = loadSample<{ posters: ContentPoster[] }>(sample);

export const ContentPosterCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [watchlist, setWatchlist] = useState<string[]>(['cp-2']);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, backgroundColor: '#0B0B0F' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {posters.map((poster) => (
          <View key={poster.id} style={{ width: poster.aspectRatio === 'landscape' ? '100%' : '30%' }}>
            <ContentPosterCard
              content={{ ...poster, watchlistState: watchlist.includes(poster.id) ? 'saved' : 'notSaved' }}
              onPress={(item) => toast.show(`Opening ${item.title}`)}
              onWatchlistToggle={(item) => setWatchlist((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))}
              onMore={(item) => toast.show(`Opening details for ${item.title}`)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
