/**
 * USAGE — FilterSortSheet + AppliedFilterBar
 *
 * Full loop: restore state → edit a draft → apply → keep applied filters visible
 * on the results screen, each individually removable.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Facet, FilterState } from '../types/domain';
import { AppliedFilterBar, FilterSortSheet, type SortOption } from './FilterSortSheet';
import { clearFacet, countAppliedFilters, encodeFilterState, toggleFacetValue } from './filterEngine';
import sample from './FilterSortSheet.sample.json';

const config = loadSample<{
  facets: Facet[];
  sortOptions: SortOption[];
  restoredState: FilterState;
}>(sample);

export const FilterSortSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState<FilterState>(config.restoredState);
  const [draft, setDraft] = useState<FilterState>(config.restoredState);

  /** Stands in for the search backend's count query. */
  const countFor = useCallback((state: FilterState) => Math.max(0, 340 - countAppliedFilters(state) * 63), []);

  const draftCount = useMemo(() => countFor(draft), [countFor, draft]);
  const appliedCount = useMemo(() => countFor(applied), [applied, countFor]);

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ paddingHorizontal: theme.spacing.md }}>
        <AppButton variant="secondary" fullWidth icon="filter-variant" onPress={() => setOpen(true)}>
          {countAppliedFilters(applied) > 0 ? `Filter & sort (${countAppliedFilters(applied)})` : 'Filter & sort'}
        </AppButton>
      </View>

      <AppliedFilterBar
        state={applied}
        facets={config.facets}
        resultCount={appliedCount}
        onRemove={(facetId, optionId) =>
          setApplied((prev) => (optionId ? toggleFacetValue(prev, facetId, optionId) : clearFacet(prev, facetId)))
        }
        onClearAll={() => setApplied({ values: {}, sort: applied.sort })}
        onPress={() => setOpen(true)}
        testID="applied-filters"
      />

      <View style={{ paddingHorizontal: theme.spacing.md }}>
        <AppCard variant="filled" title="Serialized state">
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
            {/* Shareable, restorable, and safe to put in a deep link. */}
            {encodeFilterState(applied).slice(0, 240)}
          </Text>
        </AppCard>
      </View>

      <FilterSortSheet
        visible={open}
        onDismiss={() => setOpen(false)}
        facets={config.facets}
        sortOptions={config.sortOptions}
        value={applied}
        onDraftChange={setDraft}
        resultCount={draftCount}
        onApply={(state) => {
          setApplied(state);
          toast.success(`${countFor(state)} products match`);
        }}
        testID="filter-sheet"
      />
    </ScrollView>
  );
};
