/**
 * USAGE — HotelCard
 *
 * "Free cancellation" always renders with its deadline attached — the badge
 * never appears without the date and time that make it true.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { HotelCardData } from '../types/domain';
import { HotelCard } from './HotelCard';
import sample from './HotelCard.sample.json';

const { hotels } = loadSample<{ hotels: HotelCardData[] }>(sample);

export const HotelCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [favorites, setFavorites] = useState<string[]>(['ht-1']);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {hotels.map((hotel) => (
        <HotelCard
          key={hotel.id}
          hotel={{ ...hotel, favorited: favorites.includes(hotel.id) }}
          onPress={(item) => toast.show(`Opening ${item.name}`)}
          onViewRooms={(item) => toast.show(`Opening rooms for ${item.name}`)}
          onFavoriteToggle={(item, next) => setFavorites((prev) => (next ? [...prev, item.id] : prev.filter((id) => id !== item.id)))}
        />
      ))}

      <Text variant="labelLarge">Loading</Text>
      <HotelCard hotel={hotels[0]!} loading testID="hotel-loading" />
    </ScrollView>
  );
};
