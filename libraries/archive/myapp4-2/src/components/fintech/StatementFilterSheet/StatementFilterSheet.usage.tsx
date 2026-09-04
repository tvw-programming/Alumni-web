/**
 * USAGE — StatementFilterSheet + FilterSummary
 *
 * Shows the full loop: restore from navigation state → edit a draft → apply →
 * keep the applied filters visible on the screen behind.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import type { FilterItem } from '@ui/molecules/FilterChipGroup';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { StatementFilters } from '../types/domain';
import { FilterSummary, StatementFilterSheet } from './StatementFilterSheet';
import { countActiveFilters, encodeFilters } from './filterState';
import sample from './StatementFilterSheet.sample.json';

const config = loadSample<{
  types: FilterItem[];
  statuses: FilterItem[];
  accounts: FilterItem[];
  categories: FilterItem[];
  restoredFilters: StatementFilters;
}>(sample);

export const StatementFilterSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  // Seeded as if restored from a deep link.
  const [applied, setApplied] = useState<StatementFilters>(config.restoredFilters);
  const [draft, setDraft] = useState<StatementFilters>(config.restoredFilters);

  /** Stands in for the backend count query, which must use the same semantics. */
  const draftCount = useMemo(() => Math.max(0, 128 - countActiveFilters(draft) * 17), [draft]);
  const appliedCount = useMemo(() => Math.max(0, 128 - countActiveFilters(applied) * 17), [applied]);

  const labels = useMemo(
    () => ({
      types: Object.fromEntries(config.types.map((t) => [t.key, t.label])),
      statuses: Object.fromEntries(config.statuses.map((s) => [s.key, s.label])),
      accounts: Object.fromEntries(config.accounts.map((a) => [a.key, a.label])),
    }),
    [],
  );

  const removeChip = useCallback((key: string) => {
    setApplied((prev) => {
      if (key === 'date') return { ...prev, date: undefined };
      if (key === 'merchant') return { ...prev, merchantQuery: undefined };
      const [kind, id] = key.split(/-(.+)/);
      if (kind === 'type') return { ...prev, types: prev.types?.filter((t) => t !== id) };
      if (kind === 'status') return { ...prev, statuses: prev.statuses?.filter((s) => s !== id) };
      if (kind === 'account') return { ...prev, accountIds: prev.accountIds?.filter((a) => a !== id) };
      return prev;
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ paddingHorizontal: theme.spacing.md }}>
        <AppButton variant="secondary" fullWidth icon="filter-variant" onPress={() => setOpen(true)}>
          {countActiveFilters(applied) > 0 ? `Filters (${countActiveFilters(applied)})` : 'Filter statement'}
        </AppButton>
      </View>

      {/* Applied filters stay visible — no reopening the sheet to remember. */}
      <FilterSummary
        filters={applied}
        labels={labels}
        resultCount={appliedCount}
        onRemove={removeChip}
        onClearAll={() => setApplied({})}
        onPress={() => setOpen(true)}
        testID="filter-summary"
      />

      <View style={{ paddingHorizontal: theme.spacing.md }}>
        <AppCard variant="filled" title="Serialized state">
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} selectable>
            {/* This is what goes into a deep link or navigation param. */}
            {encodeFilters(applied).slice(0, 220)}
          </Text>
        </AppCard>
      </View>

      <StatementFilterSheet
        visible={open}
        onDismiss={() => setOpen(false)}
        value={applied}
        onApply={(filters) => {
          setApplied(filters);
          toast.success(`${countActiveFilters(filters)} filters applied`);
        }}
        onDraftChange={setDraft}
        resultCount={draftCount}
        types={config.types}
        statuses={config.statuses}
        accounts={config.accounts}
        categories={config.categories}
        testID="statement-filters"
      />
    </ScrollView>
  );
};
