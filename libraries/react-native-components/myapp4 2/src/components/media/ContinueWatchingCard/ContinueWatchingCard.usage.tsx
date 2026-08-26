/**
 * USAGE — ContinueWatchingCard
 *
 * The progress text always states real minutes watched — "Watched 32 of 48
 * min" — rather than letting the bar imply an exact percentage the backend
 * doesn't actually promise (credits and skips may not count).
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ContinueWatchingItem } from '../types/domain';
import { ContinueWatchingCard } from './ContinueWatchingCard';
import sample from './ContinueWatchingCard.sample.json';

const { items: initial } = loadSample<{ items: ContinueWatchingItem[] }>(sample);

export const ContinueWatchingCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [items, setItems] = useState(initial);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, backgroundColor: '#0B0B0F' }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {items.map((item) => (
          <View key={item.id} style={{ width: '47%' }}>
            <ContinueWatchingCard
              item={item}
              onResume={(entry) => toast.show(`Resuming ${entry.title}`)}
              onStartOver={(entry) => toast.show(`Starting ${entry.title} over`)}
              onRemove={(entry) => {
                setItems((prev) => prev.filter((i) => i.id !== entry.id));
                toast.success(`Removed ${entry.title} from Continue Watching`);
              }}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
