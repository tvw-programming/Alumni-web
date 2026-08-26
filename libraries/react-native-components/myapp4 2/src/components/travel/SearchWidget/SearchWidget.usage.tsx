/**
 * USAGE — SearchWidget
 *
 * Swapping origin and arrival announces the result for screen reader users
 * instead of relying on the visual animation alone.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { OccupancyRules, RecentSearch, SearchQuery, TravelLocation } from '../types/domain';
import { SearchWidget } from './SearchWidget';
import rawSample from './SearchWidget.sample.json';

const sample = loadSample<{ locations: TravelLocation[]; recentSearches: RecentSearch[]; occupancyRules: OccupancyRules }>(rawSample);

export const SearchWidgetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [lastQuery, setLastQuery] = useState<SearchQuery | null>(null);

  const handleSearch = (query: SearchQuery) => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setLastQuery(query);
      toast.success(`Searching ${query.mode === 'flight' ? 'flights' : 'stays'}…`);
    }, 700);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SearchWidget
        onSearch={handleSearch}
        locationOptions={sample.locations}
        recentSearches={sample.recentSearches}
        occupancyRules={sample.occupancyRules}
        submitting={submitting}
        restoredNote="Restored your last search"
      />
      {lastQuery ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Last submitted: {lastQuery.mode} · {lastQuery.destination?.city ?? 'no destination'} · {lastQuery.travelers.adults} adult
          {lastQuery.travelers.adults === 1 ? '' : 's'}
        </Text>
      ) : null}
    </ScrollView>
  );
};
