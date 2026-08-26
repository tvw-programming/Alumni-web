import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Checkbox, Chip, Divider, HelperText, RadioButton, Searchbar, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppTextInput } from '@ui/atoms/AppTextInput';
import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { Facet, FacetOption, FilterState, RangeValue } from '../types/domain';
import {
  clearAllFilters,
  clearFacet,
  countAppliedFilters,
  setRangeValue,
  summarizeFilterState,
  toggleFacetValue,
  validateRange,
} from './filterEngine';

export interface SortOption {
  id: string;
  label: string;
}

export interface FilterSortSheetProps extends StyleEscapeHatches {
  visible: boolean;
  onDismiss: () => void;
  facets: Facet[];
  sortOptions?: SortOption[];
  value: FilterState;
  onApply: (state: FilterState) => void;
  /** Live count for the draft. Loading counts is normal — say so. */
  resultCount?: number;
  countLoading?: boolean;
  onDraftChange?: (draft: FilterState) => void;
  /** Long facets get an inline search box past this many options. */
  searchThreshold?: number;
}

/**
 * Catalogue filtering and sorting.
 *
 * The draft is local until Apply so an abandoned sheet cannot mutate the results
 * behind it, and the Apply button always states the outcome ("Show 128 results")
 * rather than leaving the user to guess whether anything will come back.
 */
export const FilterSortSheet = ({
  visible,
  onDismiss,
  facets,
  sortOptions = [],
  value,
  onApply,
  resultCount,
  countLoading = false,
  onDraftChange,
  searchThreshold = 8,
  style,
  containerStyle,
  testID,
}: FilterSortSheetProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const [draft, setDraft] = useState<FilterState>(value);
  const [queries, setQueries] = useState<Record<string, string>>({});
  const [rangeErrors, setRangeErrors] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (visible) setDraft(value);
  }, [value, visible]);

  const update = useCallback(
    (next: FilterState) => {
      setDraft(next);
      onDraftChange?.(next);
    },
    [onDraftChange],
  );

  const appliedCount = countAppliedFilters(draft);

  return (
    <AppSheet
      visible={visible}
      onDismiss={onDismiss}
      variant="bottom"
      title="Filter & sort"
      snapPoints={[0.9, 0.95]}
      containerStyle={containerStyle}
      style={style}
      testID={testID}
      footer={
        <View style={[styles.footer, { gap: theme.spacing.sm }]}>
          <AppButton
            variant="ghost"
            disabled={appliedCount === 0}
            onPress={() => update(clearAllFilters(draft))}
            testID={childTestID(testID, 'clear-all')}
          >
            Clear all
          </AppButton>
          <AppButton
            variant="primary"
            containerStyle={styles.flex}
            disabled={Object.keys(rangeErrors).length > 0}
            onPress={() => {
              onApply(draft);
              onDismiss();
            }}
            testID={childTestID(testID, 'apply')}
          >
            {countLoading
              ? 'Apply'
              : resultCount != null
                ? `Show ${resultCount} result${resultCount === 1 ? '' : 's'}`
                : 'Apply'}
          </AppButton>
        </View>
      }
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {sortOptions.length > 0 ? (
          <View style={{ marginBottom: theme.spacing.lg }}>
            <Text variant="labelLarge" accessibilityRole="header" style={{ marginBottom: theme.spacing.sm }}>
              Sort by
            </Text>
            {/* Sort is single-select — a radio group, never checkboxes. */}
            <RadioButton.Group
              value={draft.sort ?? ''}
              onValueChange={(next) => update({ ...draft, sort: next })}
            >
              {sortOptions.map((option) => (
                <RadioButton.Item
                  key={option.id}
                  label={option.label}
                  value={option.id}
                  position="leading"
                  accessibilityLabel={option.label}
                  testID={childTestID(testID, `sort-${option.id}`)}
                />
              ))}
            </RadioButton.Group>
            <Divider />
          </View>
        ) : null}

        {facets.map((facet) => {
          const current = draft.values[facet.id];
          const selectedIds = Array.isArray(current) ? current : [];
          const query = queries[facet.id] ?? '';
          const searchable = facet.type === 'searchableList' || (facet.options?.length ?? 0) > searchThreshold;

          const options = (facet.options ?? []).filter((option) =>
            query ? option.label.toLowerCase().includes(query.toLowerCase()) : true,
          );

          return (
            <View key={facet.id} style={{ marginBottom: theme.spacing.lg }}>
              <View style={styles.headerRow}>
                <Text variant="labelLarge" accessibilityRole="header" style={styles.flex}>
                  {facet.label}
                </Text>
                {selectedIds.length > 0 ? (
                  <Text
                    variant="labelSmall"
                    onPress={() => update(clearFacet(draft, facet.id))}
                    accessibilityRole="button"
                    accessibilityLabel={`Clear ${facet.label} filter`}
                    style={{ color: theme.colors.primary }}
                    testID={childTestID(testID, `clear-${facet.id}`)}
                  >
                    Clear
                  </Text>
                ) : null}
              </View>

              {facet.type === 'range' ? (
                <RangeFacet
                  facet={facet}
                  value={(current as RangeValue) ?? { min: facet.min ?? 0, max: facet.max ?? 0 }}
                  error={rangeErrors[facet.id]}
                  onChange={(range) => {
                    const error = validateRange(facet, range);
                    setRangeErrors((prev) => {
                      const next = { ...prev };
                      if (error) next[facet.id] = error;
                      else delete next[facet.id];
                      return next;
                    });
                    update(setRangeValue(draft, facet.id, range));
                  }}
                  testID={childTestID(testID, facet.id)}
                />
              ) : (
                <>
                  {searchable ? (
                    <Searchbar
                      value={query}
                      onChangeText={(next) => setQueries((prev) => ({ ...prev, [facet.id]: next }))}
                      placeholder={`Search ${facet.label.toLowerCase()}`}
                      style={{ marginBottom: theme.spacing.sm, borderRadius: theme.radii.md }}
                      inputStyle={{ minHeight: 0 }}
                      testID={childTestID(testID, `search-${facet.id}`)}
                    />
                  ) : null}

                  {facet.type === 'swatch' ? (
                    <View style={[styles.swatches, { gap: theme.spacing.sm }]}>
                      {options.map((option) => (
                        <SwatchOption
                          key={option.id}
                          option={option}
                          selected={selectedIds.includes(option.id)}
                          onPress={() => update(toggleFacetValue(draft, facet.id, option.id))}
                          testID={childTestID(testID, `${facet.id}-${option.id}`)}
                        />
                      ))}
                    </View>
                  ) : facet.type === 'radio' ? (
                    <RadioButton.Group
                      value={selectedIds[0] ?? ''}
                      onValueChange={(next) => update(toggleFacetValue(draft, facet.id, next, false))}
                    >
                      {options.map((option) => (
                        <RadioButton.Item
                          key={option.id}
                          label={option.count != null ? `${option.label} (${option.count})` : option.label}
                          value={option.id}
                          position="leading"
                          disabled={option.disabled}
                          testID={childTestID(testID, `${facet.id}-${option.id}`)}
                        />
                      ))}
                    </RadioButton.Group>
                  ) : (
                    options.map((option) => (
                      <Checkbox.Item
                        key={option.id}
                        label={option.count != null ? `${option.label} (${option.count})` : option.label}
                        status={selectedIds.includes(option.id) ? 'checked' : 'unchecked'}
                        position="leading"
                        disabled={option.disabled}
                        onPress={() => update(toggleFacetValue(draft, facet.id, option.id))}
                        accessibilityLabel={`${option.label}${option.count != null ? `, ${option.count} products` : ''}`}
                        testID={childTestID(testID, `${facet.id}-${option.id}`)}
                      />
                    ))
                  )}

                  {options.length === 0 ? (
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Nothing matches “{query}”.
                    </Text>
                  ) : null}
                </>
              )}
            </View>
          );
        })}

        {resultCount === 0 ? (
          <Text variant="labelSmall" style={{ color: shop.colors.lowStock, marginBottom: theme.spacing.md }}>
            These filters return no products. Try removing one.
          </Text>
        ) : null}
      </ScrollView>
    </AppSheet>
  );
};

const RangeFacet = ({
  facet,
  value,
  error,
  onChange,
  testID,
}: {
  facet: Facet;
  value: RangeValue;
  error?: string;
  onChange: (range: RangeValue) => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  return (
    <View style={{ gap: theme.spacing.sm }}>
      <View style={[styles.rangeRow, { gap: theme.spacing.sm }]}>
        <View style={styles.flex}>
          <AppTextInput
            label={`Min${facet.unitLabel ? ` (${facet.unitLabel})` : ''}`}
            value={String(value.min)}
            onChangeText={(text) => onChange({ ...value, min: Number.parseInt(text, 10) || 0 })}
            keyboardType="number-pad"
            size="sm"
            error={!!error}
            testID={childTestID(testID, 'min')}
          />
        </View>
        <View style={styles.flex}>
          <AppTextInput
            label={`Max${facet.unitLabel ? ` (${facet.unitLabel})` : ''}`}
            value={String(value.max)}
            onChangeText={(text) => onChange({ ...value, max: Number.parseInt(text, 10) || 0 })}
            keyboardType="number-pad"
            size="sm"
            error={!!error}
            testID={childTestID(testID, 'max')}
          />
        </View>
      </View>
      {error ? (
        <HelperText type="error" visible padding="none">
          {error}
        </HelperText>
      ) : null}
    </View>
  );
};

const SwatchOption = ({
  option,
  selected,
  onPress,
  testID,
}: {
  option: FacetOption;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const shop = useShopTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      disabled={option.disabled}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected, disabled: option.disabled }}
      accessibilityLabel={`${option.label}${option.count != null ? `, ${option.count} products` : ''}`}
      borderless
      style={{ borderRadius: theme.radii.pill }}
      testID={testID}
    >
      <View style={styles.swatchWrap}>
        <View
          style={{
            width: shop.layout.swatchSize,
            height: shop.layout.swatchSize,
            borderRadius: theme.radii.pill,
            backgroundColor: option.swatch?.color ?? theme.colors.surfaceVariant,
            borderWidth: selected ? 3 : 1,
            borderColor: selected ? shop.colors.swatchSelected : shop.colors.swatchBorder,
            opacity: option.disabled ? 0.4 : 1,
          }}
        />
        <Text variant="labelSmall" numberOfLines={1} style={{ maxWidth: 56, textAlign: 'center' }}>
          {option.label}
        </Text>
      </View>
    </TouchableRipple>
  );
};

export interface AppliedFilterBarProps {
  state: FilterState;
  facets: Facet[];
  resultCount?: number;
  onRemove?: (facetId: string, optionId?: string) => void;
  onClearAll?: () => void;
  onPress?: () => void;
  testID?: string;
}

/** Applied filters shown on the results screen, outside the sheet. */
export const AppliedFilterBar = ({
  state,
  facets,
  resultCount,
  onRemove,
  onClearAll,
  onPress,
  testID,
}: AppliedFilterBarProps) => {
  const theme = useAppTheme();
  const chips = useMemo(() => summarizeFilterState(state, facets), [facets, state]);

  if (chips.length === 0) return null;

  return (
    <View style={{ gap: theme.spacing.xs, paddingHorizontal: theme.spacing.md }} testID={testID}>
      {resultCount != null ? (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
          // Result changes are announced, not silently swapped.
          accessibilityLiveRegion="polite"
        >
          {resultCount} product{resultCount === 1 ? '' : 's'}
        </Text>
      ) : null}
      <View style={[styles.swatches, { gap: theme.spacing.xs }]}>
        {chips.map((chip) => (
          <Chip
            key={chip.key}
            compact
            onPress={onPress}
            onClose={onRemove ? () => onRemove(chip.facetId, chip.optionId) : undefined}
            testID={childTestID(testID, `chip-${chip.key}`)}
          >
            {chip.label}
          </Chip>
        ))}
        {onClearAll ? (
          <Chip compact icon="close" onPress={onClearAll} testID={childTestID(testID, 'clear')}>
            Clear all
          </Chip>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  swatchWrap: { alignItems: 'center', gap: 4 },
  rangeRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});
