import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppSheet } from '@ui/organisms/AppSheet';
import { DateRangePicker, type DateRange } from '@ui/molecules/DateRangePicker';
import { FilterChipGroup, type FilterItem } from '@ui/molecules/FilterChipGroup';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useFintechTheme } from '../theme/fintechTokens';
import type { StatementFilters } from '../types/domain';
import { DATE_PRESETS, countActiveFilters, summarizeFilters, validateDateRange } from './filterState';

export interface StatementFilterSheetProps extends StyleEscapeHatches {
  visible: boolean;
  onDismiss: () => void;
  /** Current filters, restored from navigation state by the caller. */
  value: StatementFilters;
  onApply: (filters: StatementFilters) => void;
  types?: FilterItem[];
  statuses?: FilterItem[];
  accounts?: FilterItem[];
  categories?: FilterItem[];
  /** Live count for the current draft — answers "will this find anything?". */
  resultCount?: number;
  loadingCount?: boolean;
  onDraftChange?: (draft: StatementFilters) => void;
}

/**
 * Statement filtering.
 *
 * The draft is local until Apply, so an abandoned sheet cannot mutate the list
 * behind it. `FilterSummary` then keeps the applied filters visible on the
 * underlying screen — nobody should have to reopen a sheet to remember what is
 * filtered.
 */
export const StatementFilterSheet = ({
  visible,
  onDismiss,
  value,
  onApply,
  types = [],
  statuses = [],
  accounts = [],
  categories = [],
  resultCount,
  loadingCount = false,
  onDraftChange,
  style,
  containerStyle,
  testID,
}: StatementFilterSheetProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();
  const [draft, setDraft] = useState<StatementFilters>(value);

  // Re-sync whenever the sheet is reopened with different applied filters.
  React.useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const update = useCallback(
    (patch: Partial<StatementFilters>) => {
      setDraft((prev) => {
        const next = { ...prev, ...patch };
        onDraftChange?.(next);
        return next;
      });
    },
    [onDraftChange],
  );

  const range = useMemo<DateRange>(
    () => ({
      start: draft.date?.from ? new Date(draft.date.from) : null,
      end: draft.date?.to ? new Date(draft.date.to) : null,
    }),
    [draft.date],
  );

  const dateError = validateDateRange(draft.date?.from, draft.date?.to);
  const activeCount = countActiveFilters(draft);

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title="Filter statement"
      scrollable
      snapPoints={[0.85, 0.95]}
      containerStyle={containerStyle}
      style={style}
      testID={testID}
      footer={
        <View style={[styles.footer, { gap: theme.spacing.sm }]}>
          <AppButton
            variant="ghost"
            onPress={() => update({ date: undefined, types: [], statuses: [], accountIds: [], categoryIds: [], merchantQuery: undefined })}
            disabled={activeCount === 0}
            testID={childTestID(testID, 'clear-all')}
          >
            Clear all
          </AppButton>
          <AppButton
            variant="primary"
            onPress={() => {
              onApply(draft);
              onDismiss();
            }}
            disabled={!!dateError}
            containerStyle={styles.flex}
            testID={childTestID(testID, 'apply')}
          >
            {loadingCount
              ? 'Apply'
              : resultCount != null
                ? `Show ${resultCount} result${resultCount === 1 ? '' : 's'}`
                : 'Apply filters'}
          </AppButton>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Section title="Date range">
          <View style={[styles.presets, { gap: theme.spacing.sm }]}>
            {DATE_PRESETS.map((preset) => (
              <Chip
                key={preset.key}
                selected={draft.date?.preset === preset.key}
                showSelectedCheck={draft.date?.preset === preset.key}
                onPress={() => update({ date: { preset: preset.key, ...preset.resolve() } })}
                accessibilityState={{ selected: draft.date?.preset === preset.key }}
                testID={childTestID(testID, `preset-${preset.key}`)}
              >
                {preset.label}
              </Chip>
            ))}
          </View>

          <DateRangePicker
            value={range}
            onChange={(next) =>
              update({
                date: {
                  from: next.start?.toISOString(),
                  to: next.end?.toISOString(),
                  preset: undefined,
                },
              })
            }
            label="Custom range"
            error={!!dateError}
            containerStyle={{ marginTop: theme.spacing.sm }}
            testID={childTestID(testID, 'custom-range')}
          />

          {dateError ? (
            <Text variant="labelSmall" style={{ color: fintech.colors.statusError, marginTop: theme.spacing.xs }}>
              {dateError}
            </Text>
          ) : null}
        </Section>

        {types.length > 0 && (
          <Section title="Transaction type">
            <FilterChipGroup
              items={types}
              selected={draft.types ?? []}
              onChange={(next) => update({ types: next })}
              scrollable={false}
              testID={childTestID(testID, 'types')}
            />
          </Section>
        )}

        {statuses.length > 0 && (
          <Section title="Status">
            <FilterChipGroup
              items={statuses}
              selected={draft.statuses ?? []}
              onChange={(next) => update({ statuses: next })}
              scrollable={false}
              testID={childTestID(testID, 'statuses')}
            />
          </Section>
        )}

        {accounts.length > 0 && (
          <Section title="Account or card">
            <FilterChipGroup
              items={accounts}
              selected={draft.accountIds ?? []}
              onChange={(next) => update({ accountIds: next })}
              scrollable={false}
              testID={childTestID(testID, 'accounts')}
            />
          </Section>
        )}

        {categories.length > 0 && (
          <Section title="Category">
            <FilterChipGroup
              items={categories}
              selected={draft.categoryIds ?? []}
              onChange={(next) => update({ categoryIds: next })}
              scrollable={false}
              maxVisible={6}
              testID={childTestID(testID, 'categories')}
            />
          </Section>
        )}
      </ScrollView>
    </AppSheet>
  );
};

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const theme = useAppTheme();
  return (
    <View style={{ marginBottom: theme.spacing.lg }}>
      <Text variant="labelLarge" accessibilityRole="header" style={{ marginBottom: theme.spacing.sm }}>
        {title}
      </Text>
      {children}
    </View>
  );
};

export interface FilterSummaryProps {
  filters: StatementFilters;
  labels?: Parameters<typeof summarizeFilters>[1];
  onRemove?: (key: string) => void;
  onClearAll?: () => void;
  onPress?: () => void;
  resultCount?: number;
  testID?: string;
}

/** Applied filters, rendered on the screen behind the sheet. */
export const FilterSummary = ({
  filters,
  labels,
  onRemove,
  onClearAll,
  onPress,
  resultCount,
  testID,
}: FilterSummaryProps) => {
  const theme = useAppTheme();
  const items = summarizeFilters(filters, labels);

  if (items.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md }} testID={testID}>
      {resultCount != null ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} accessibilityLiveRegion="polite">
          {resultCount} result{resultCount === 1 ? '' : 's'}
        </Text>
      ) : null}

      <View style={[styles.presets, { gap: theme.spacing.xs }]}>
        {items.map((item) => (
          <Chip
            key={item.key}
            compact
            onPress={onPress}
            onClose={onRemove ? () => onRemove(item.key) : undefined}
            testID={childTestID(testID, `chip-${item.key}`)}
          >
            {item.label}
          </Chip>
        ))}
        {onClearAll ? (
          <Chip compact icon="close" onPress={onClearAll} testID={childTestID(testID, 'clear')}>
            Clear
          </Chip>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  presets: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
