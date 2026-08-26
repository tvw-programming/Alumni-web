/**
 * USAGE — PropertyCard
 *
 * "Lakeview Villa" (sold) stays in the results with an honest overlay
 * instead of disappearing from a saved search the moment it's no longer
 * available.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PropertySummary } from '../types/domain';
import { PropertyCard } from './PropertyCard';
import sample from './PropertyCard.sample.json';

const { properties } = loadSample<{ properties: PropertySummary[] }>(sample);

export const PropertyCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [saved, setSaved] = useState<string[]>(['pr-1']);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {properties.map((property) => (
          <View key={property.id} style={{ width: '47%' }}>
            <PropertyCard
              property={property}
              saved={saved.includes(property.id)}
              onPress={(item) => toast.show(`Opening ${item.title}`)}
              onToggleSave={(item) => setSaved((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))}
              onContact={(item) => toast.show(`Contacting about ${item.title}`)}
            />
          </View>
        ))}
      </View>

      <PropertyCard property={properties[1]!} variant="list" onPress={(item) => toast.show(`Opening ${item.title}`)} onContact={(item) => toast.show(`Contacting about ${item.title}`)} />
    </ScrollView>
  );
};
