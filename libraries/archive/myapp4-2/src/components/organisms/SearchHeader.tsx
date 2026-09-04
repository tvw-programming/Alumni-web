import React, { forwardRef, useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, Searchbar, Text } from 'react-native-paper';
import Animated, { FadeIn, interpolate, useAnimatedStyle } from 'react-native-reanimated';

import { useControllableState, useDebouncedValue, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { FilterChipGroup, type FilterItem } from '../molecules/FilterChipGroup';
import { useScrollOffset } from './AppFAB';
import type { StyleEscapeHatches } from '../primitives';

export interface SearchHeaderProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  value?: string;
  defaultValue?: string;
  /** Fired immediately on every keystroke. */
  onChangeText?: (text: string) => void;
  /** Fired only after the user stops typing — wire this to your query. */
  onSearch?: (text: string) => void;
  debounceMs?: number;
  placeholder?: string;
  filters?: FilterItem[];
  activeFilters?: string[];
  onFilterChange?: (keys: string[]) => void;
  showFilterCount?: boolean;
  onClear?: () => void;
  recentSearches?: string[];
  onRecentPress?: (term: string) => void;
  /** Translate out of view as the attached list scrolls down. */
  collapseOnScroll?: boolean;
}

const COLLAPSE_DISTANCE = 90;

export const SearchHeader = forwardRef<View, SearchHeaderProps>(function SearchHeader(
  {
    value,
    defaultValue = '',
    onChangeText,
    onSearch,
    debounceMs = 300,
    placeholder = 'Search',
    filters = [],
    activeFilters,
    onFilterChange,
    showFilterCount = true,
    onClear,
    recentSearches = [],
    onRecentPress,
    collapseOnScroll = false,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useControllableState<string>({ value, defaultValue, onChange: onChangeText });

  const debounced = useDebouncedValue(query, debounceMs);
  useEffect(() => {
    onSearch?.(debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const scrollOffset = useScrollOffset();
  const collapseStyle = useAnimatedStyle(() => {
    if (!collapseOnScroll || !scrollOffset || !motion.enabled) return { transform: [{ translateY: 0 }], opacity: 1 };
    const y = interpolate(scrollOffset.value, [0, COLLAPSE_DISTANCE], [0, -COLLAPSE_DISTANCE], 'clamp');
    return {
      transform: [{ translateY: y }],
      opacity: interpolate(scrollOffset.value, [0, COLLAPSE_DISTANCE], [1, 0], 'clamp'),
    };
  }, [collapseOnScroll, motion.enabled]);

  const handleClear = useCallback(() => {
    setQuery('');
    onClear?.();
  }, [onClear, setQuery]);

  const filterCount = activeFilters?.length ?? 0;
  const showRecents = focused && query.length === 0 && recentSearches.length > 0;

  return (
    <Animated.View
      ref={ref}
      style={[{ paddingVertical: theme.spacing.sm, gap: theme.spacing.sm }, containerStyle, collapseStyle]}
      testID={testID}
    >
      <View style={[styles.row, { paddingHorizontal: theme.spacing.md, gap: theme.spacing.sm }]}>
        <Searchbar
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onClearIconPress={handleClear}
          style={[styles.flex, { borderRadius: theme.radii.pill }, style]}
          inputStyle={{ minHeight: 0 }}
          accessibilityLabel={placeholder}
          testID={childTestID(testID, 'input')}
        />

        {showFilterCount && filterCount > 0 && (
          <Animated.View entering={motion.entering('scale')}>
            <Chip
              icon="filter-variant"
              onPress={() => onFilterChange?.([])}
              accessibilityLabel={`${filterCount} filters active, tap to clear`}
              testID={childTestID(testID, 'filter-count')}
            >
              {filterCount}
            </Chip>
          </Animated.View>
        )}
      </View>

      {showRecents && (
        <Animated.View
          entering={motion.enabled ? FadeIn.duration(motion.ms('fast')) : undefined}
          style={{ paddingHorizontal: theme.spacing.md, gap: theme.spacing.xs }}
        >
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Recent
          </Text>
          <View style={[styles.wrap, { gap: theme.spacing.xs }]}>
            {recentSearches.map((term) => (
              <Chip
                key={term}
                icon="history"
                compact
                onPress={() => {
                  setQuery(term);
                  onRecentPress?.(term);
                }}
                testID={childTestID(testID, `recent-${term}`)}
              >
                {term}
              </Chip>
            ))}
          </View>
        </Animated.View>
      )}

      {filters.length > 0 && (
        <FilterChipGroup
          items={filters}
          selected={activeFilters}
          onChange={onFilterChange}
          showClearAll
          animated={animated}
          testID={childTestID(testID, 'filters')}
        />
      )}
    </Animated.View>
  );
});

/** Convenience icon button for opening a filter sheet from the header. */
export const FilterButton = ({ onPress, count = 0 }: { onPress: () => void; count?: number }) => (
  <IconButton
    icon={count > 0 ? 'filter-variant-plus' : 'filter-variant'}
    onPress={onPress}
    accessibilityLabel={`Filters${count > 0 ? `, ${count} active` : ''}`}
  />
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap' },
  flex: { flex: 1 },
});
