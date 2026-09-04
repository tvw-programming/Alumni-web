import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { DataTable, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { RatingStars } from '@ui/atoms/RatingStars';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { RatingBreakdownData } from '../types/domain';

export type StarKey = 1 | 2 | 3 | 4 | 5;

export interface RatingBreakdownProps extends StyleEscapeHatches {
  data: RatingBreakdownData;
  variant?: 'histogram' | 'compact';
  /** Currently active star filter, if any. */
  activeStar?: StarKey;
  onStarPress?: (star: StarKey) => void;
  /** Attribute bars: fit, comfort, value… */
  attributes?: Array<{ id: string; label: string; value: number; scaleLabel?: [string, string] }>;
  showTable?: boolean;
}

/**
 * Star distribution.
 *
 * Each bar is a real `progressbar` with an accessible name and value, so
 * "5 stars, 62 percent of reviews" is announced rather than a bare bar. The
 * table variant exists for exact values.
 */
export const RatingBreakdown = ({
  data,
  variant = 'histogram',
  activeStar,
  onStarPress,
  attributes = [],
  showTable = false,
  style,
  containerStyle,
  testID,
}: RatingBreakdownProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();

  const rows = useMemo(() => {
    const stars: StarKey[] = [5, 4, 3, 2, 1];
    return stars.map((star) => {
      const count = data.counts[star] ?? 0;
      const share = data.totalCount > 0 ? count / data.totalCount : 0;
      return { star, count, share };
    });
  }, [data]);

  if (variant === 'compact') {
    return (
      <View
        style={[styles.compact, containerStyle, style]}
        accessible
        accessibilityRole="text"
        accessibilityLabel={`Rated ${data.average.toFixed(1)} out of 5 from ${data.totalCount} reviews`}
        testID={testID}
      >
        <Text variant="headlineSmall" style={styles.tabular}>
          {data.average.toFixed(1)}
        </Text>
        <RatingStars value={data.average} readonly allowHalf size="sm" entering={false} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {data.totalCount} reviews
        </Text>
      </View>
    );
  }

  return (
    <View style={[{ gap: theme.spacing.sm }, containerStyle, style]} testID={testID}>
      <View style={[styles.summary, { gap: theme.spacing.md }]}>
        <View style={styles.center}>
          <Text variant="displaySmall" style={styles.tabular}>
            {data.average.toFixed(1)}
          </Text>
          <RatingStars value={data.average} readonly allowHalf size="md" entering={false} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {data.totalCount} reviews
          </Text>
        </View>

        <View style={styles.flex}>
          {rows.map((row) => {
            const percent = Math.round(row.share * 100);
            const active = activeStar === row.star;
            return (
              <TouchableRipple
                key={row.star}
                onPress={onStarPress ? () => onStarPress(row.star) : undefined}
                disabled={!onStarPress || row.count === 0}
                accessibilityRole={onStarPress ? 'button' : 'progressbar'}
                accessibilityState={{ selected: active, disabled: row.count === 0 }}
                // The label carries the meaning; the bar is decoration.
                accessibilityLabel={`${row.star} star${row.star === 1 ? '' : 's'}: ${percent} percent of reviews, ${row.count} reviews`}
                accessibilityValue={{ min: 0, max: 100, now: percent }}
                testID={childTestID(testID, `star-${row.star}`)}
              >
                <View style={[styles.barRow, { gap: theme.spacing.xs, paddingVertical: 3 }]}>
                  <Text variant="labelSmall" style={styles.starLabel}>
                    {row.star}★
                  </Text>
                  <ProgressBar
                    progress={row.share}
                    color={active ? theme.colors.primary : shop.colors.ratingFill}
                    style={[styles.bar, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}
                  />
                  <Text variant="labelSmall" style={[styles.countLabel, { color: theme.colors.onSurfaceVariant }]}>
                    {percent}%
                  </Text>
                </View>
              </TouchableRipple>
            );
          })}
        </View>
      </View>

      {attributes.length > 0 ? (
        <View style={{ gap: theme.spacing.xs, marginTop: theme.spacing.sm }}>
          {attributes.map((attribute) => (
            <View key={attribute.id} style={{ gap: 2 }}>
              <View style={styles.barRow}>
                <Text variant="labelSmall" style={styles.flex}>
                  {attribute.label}
                </Text>
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {attribute.value.toFixed(1)}/5
                </Text>
              </View>
              <ProgressBar
                progress={attribute.value / 5}
                color={shop.colors.ratingFill}
                style={[styles.bar, { borderRadius: theme.radii.pill }]}
                accessibilityLabel={`${attribute.label}: ${attribute.value.toFixed(1)} out of 5`}
              />
              {attribute.scaleLabel ? (
                <View style={styles.barRow}>
                  <Text variant="labelSmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
                    {attribute.scaleLabel[0]}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {attribute.scaleLabel[1]}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      ) : null}

      {showTable ? (
        <DataTable testID={childTestID(testID, 'table')}>
          <DataTable.Header>
            <DataTable.Title>Rating</DataTable.Title>
            <DataTable.Title numeric>Reviews</DataTable.Title>
            <DataTable.Title numeric>Share</DataTable.Title>
          </DataTable.Header>
          {rows.map((row) => (
            <DataTable.Row key={row.star}>
              <DataTable.Cell>{row.star} stars</DataTable.Cell>
              <DataTable.Cell numeric>{row.count}</DataTable.Cell>
              <DataTable.Cell numeric>{(row.share * 100).toFixed(1)}%</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  compact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summary: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center' },
  barRow: { flexDirection: 'row', alignItems: 'center' },
  bar: { flex: 1, height: 8 },
  starLabel: { width: 24 },
  countLabel: { width: 36, textAlign: 'right' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
