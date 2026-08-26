/**
 * USAGE — AmenityIconGrid
 *
 * Wheelchair accessibility is intentionally shown as "unknown" rather than a
 * bare checkmark icon — a generic accessibility glyph never stands in for
 * step-free entrance, an accessible bathroom, or elevator details.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Amenity } from '../types/domain';
import { AmenityIconGrid } from './AmenityIconGrid';
import sample from './AmenityIconGrid.sample.json';

const { amenities } = loadSample<{ amenities: Amenity[] }>(sample);

export const AmenityIconGridUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="titleSmall">Compact (6 of {amenities.length})</Text>
      <AmenityIconGrid amenities={amenities} maxVisible={6} onShowAll={() => toast.show('Opening full amenity list')} />

      <Text variant="titleSmall">Full list</Text>
      <AmenityIconGrid amenities={amenities} maxVisible={amenities.length} columns={4} />
    </ScrollView>
  );
};
