/**
 * USAGE — PropertyFilterSheet
 *
 * The result count near Apply updates live as filters change — "Show 248
 * homes" — so the consequence of a filter change is visible before
 * committing to it.
 */
import React, { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PropertyFilterState } from '../types/domain';
import { PropertyFilterSheet } from './PropertyFilterSheet';
import rawSample from './PropertyFilterSheet.sample.json';

const initial = loadSample<{ filters: PropertyFilterState; resultCount: number }>(rawSample);

export const PropertyFilterSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [visible, setVisible] = useState(false);
  const [filters, setFilters] = useState<PropertyFilterState>(initial.filters);
  const [resultCount, setResultCount] = useState(initial.resultCount);

  const handleChange = (next: PropertyFilterState) => {
    setFilters(next);
    // Stands in for a live count query as filters change.
    setResultCount(Math.max(0, initial.resultCount - Object.values(next).flat().length * 12));
  };

  return (
    <View style={{ padding: theme.spacing.md }}>
      <AppButton variant="primary" onPress={() => setVisible(true)}>
        Open filters
      </AppButton>

      <PropertyFilterSheet
        visible={visible}
        filters={filters}
        resultCount={resultCount}
        onDismiss={() => setVisible(false)}
        onChange={handleChange}
        onApply={() => {
          setVisible(false);
          toast.success(`Showing ${resultCount} homes`);
        }}
        onClearAll={() => {
          setFilters({});
          setResultCount(1240);
          toast.show('Filters cleared');
        }}
      />
    </View>
  );
};
