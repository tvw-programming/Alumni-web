/**
 * USAGE — FilterToolbar
 *
 * Active filters render as removable chips right in the toolbar — a viewer
 * never has to reopen the menu to remember what's currently narrowing their
 * view.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { FilterDefinition, FilterValues } from '../types/domain';
import { FilterToolbar } from './FilterToolbar';
import sample from './FilterToolbar.sample.json';

const initial = loadSample<{ definitions: FilterDefinition[]; values: FilterValues; resultCount: number }>(sample);

export const FilterToolbarUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [values, setValues] = useState<FilterValues>(initial.values);
  const [resultCount, setResultCount] = useState(initial.resultCount);

  const handleChange = (next: FilterValues) => {
    setValues(next);
    setResultCount(Math.max(0, 120 - Object.keys(next).length * 18));
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <FilterToolbar
        definitions={initial.definitions}
        values={values}
        resultCount={resultCount}
        onChange={handleChange}
        onClear={() => {
          setValues({});
          setResultCount(120);
          toast.show('Filters cleared');
        }}
        onSaveView={() => toast.success('View saved')}
      />
    </ScrollView>
  );
};
