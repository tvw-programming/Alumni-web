/**
 * USAGE — WatchlistToggle + MaturityRatingChip
 *
 * The restricted rating renders "Restricted for this profile" as real text
 * next to the chip — never a colour change alone.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { MaturityRatingChip } from './MaturityRatingChip';
import { WatchlistToggle } from './WatchlistToggle';
import sample from './WatchlistAndRating.sample.json';

const { title, ratings } = loadSample<{ title: string; ratings: { rating: string; descriptors: string[]; restricted: boolean }[] }>(sample);

export const WatchlistAndRatingUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleToggle = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSaved((v) => !v);
      toast.success(saved ? `Removed ${title} from My List` : `Added ${title} to My List`);
    }, 500);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View style={{ backgroundColor: '#0B0B0F', padding: theme.spacing.md, borderRadius: theme.radii.md, alignItems: 'flex-start' }}>
        <WatchlistToggle title={title} saved={saved} loading={loading} onToggle={handleToggle} />
      </View>

      <WatchlistToggle title={title} saved={saved} loading={loading} onToggle={handleToggle} showLabel />

      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="titleSmall">Maturity ratings</Text>
        {ratings.map((item) => (
          <MaturityRatingChip key={item.rating} {...item} onPress={() => toast.show(`Rating: ${item.rating}`)} />
        ))}
      </View>
    </ScrollView>
  );
};
