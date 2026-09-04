/**
 * USAGE — SavedSearchItem + PriceTrendChart
 *
 * The chart always closes with "Historical trend, not investment advice" —
 * a price direction is never left to read as a recommendation.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PriceTrendPoint, SavedSearch, TrendRange } from '../types/domain';
import { PriceTrendChart } from './PriceTrendChart';
import { SavedSearchItem } from './SavedSearchItem';
import sample from './SavedSearchAndTrend.sample.json';

const data = loadSample<{ searches: SavedSearch[]; trend: { points: PriceTrendPoint[]; currentValue: number; freshnessLabel: string } }>(sample);

export const SavedSearchAndTrendUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [searches, setSearches] = useState(data.searches);
  const [range, setRange] = useState<TrendRange>('1y');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <ScrollView>
        {searches.map((search, index) => (
          <React.Fragment key={search.id}>
            <SavedSearchItem
              search={search}
              onPress={(item) => toast.show(`Opening results for ${item.name}`)}
              onEdit={(item) => toast.show(`Editing ${item.name}`)}
              onTogglePause={(item) => setSearches((prev) => prev.map((s) => (s.id === item.id ? { ...s, paused: !s.paused } : s)))}
              onDelete={(item) => {
                setSearches((prev) => prev.filter((s) => s.id !== item.id));
                toast.success(`Deleted "${item.name}"`);
              }}
            />
            {index < searches.length - 1 ? <Divider /> : null}
          </React.Fragment>
        ))}
      </ScrollView>

      <PriceTrendChart points={data.trend.points} currentValue={data.trend.currentValue} range={range} freshnessLabel={data.trend.freshnessLabel} onRangeChange={setRange} />
    </ScrollView>
  );
};
