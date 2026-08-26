/**
 * USAGE — AmenityGrid
 *
 * Wheelchair accessibility is shown as "Details unavailable" rather than a
 * bare checkmark — a generic accessibility icon never substitutes for real
 * step-free-entrance or accessible-bathroom information.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PropertyAmenity } from '../types/domain';
import { AmenityGrid } from './AmenityGrid';
import sample from './AmenityGrid.sample.json';

const { amenities } = loadSample<{ amenities: PropertyAmenity[] }>(sample);

export const AmenityGridUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="titleSmall">Compact (8 of {amenities.length})</Text>
      <AmenityGrid amenities={amenities} maxVisible={8} onShowAll={() => toast.show('Opening full amenity list')} />

      <Text variant="titleSmall">Full list</Text>
      <AmenityGrid amenities={amenities} maxVisible={amenities.length} columns={2} />
    </ScrollView>
  );
};
