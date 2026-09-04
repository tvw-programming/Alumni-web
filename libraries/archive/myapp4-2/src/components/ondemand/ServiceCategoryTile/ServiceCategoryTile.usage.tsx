/**
 * USAGE — ServiceCategoryTile
 *
 * Pest control stays visible but disabled with its reason — hiding it entirely
 * would look like a bug rather than a location limitation.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ServiceCategory } from '../types/domain';
import { ServiceCategoryTile, type CategoryTileVariant } from './ServiceCategoryTile';
import sample from './ServiceCategoryTile.sample.json';

const data = loadSample<{ categories: ServiceCategory[]; compactList: ServiceCategory[] }>(sample);

export const ServiceCategoryTileUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [variant, setVariant] = useState<CategoryTileVariant>('grid');
  const [selectedId, setSelectedId] = useState('cat-2');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={variant}
        onValueChange={(next) => setVariant(next as CategoryTileVariant)}
        density="small"
        buttons={[
          { value: 'grid', label: 'Grid' },
          { value: 'compact', label: 'Compact' },
        ]}
      />

      {variant === 'grid' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md }}>
          {data.categories.map((category, index) => (
            <ServiceCategoryTile
              key={category.id}
              category={{ ...category, state: category.state === 'loading' ? 'loading' : selectedId === category.id ? 'selected' : 'default' }}
              variant="grid"
              index={index}
              entering="scale"
              onPress={(item) => {
                setSelectedId(item.id);
                toast.show(`Opening ${item.label}`);
              }}
              testID={`category-grid-${category.id}`}
            />
          ))}
        </View>
      ) : (
        <View style={{ gap: theme.spacing.sm }}>
          {data.compactList.map((category, index) => (
            <ServiceCategoryTile
              key={category.id}
              category={category}
              variant="compact"
              index={index}
              entering="slideUp"
              onPress={(item) => toast.show(`Opening ${item.label}`)}
              testID={`category-compact-${category.id}`}
            />
          ))}
        </View>
      )}

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Selection carries a border, a fill and the word "selected" in the accessible name — never a tint alone.
      </Text>
    </ScrollView>
  );
};
