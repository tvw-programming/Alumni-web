import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { IconButton, SegmentedButtons, Text } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { formatMoney, type Money } from '../types/money';
import type { CategoryDatum } from '../types/domain';
import { DonutChart } from './DonutChart';
import { BarChart, type TrendPoint } from './BarChart';
import { AccessibleDataTable, CategoryLegend } from './CategoryLegend';

export type ChartKind = 'donut' | 'bar';

export interface SpendingCategoryChartProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  data: CategoryDatum[];
  total: Money;
  periodLabel: string;
  /**
   * REQUIRED. States what the number actually covers — "Card spending",
   * "All accounts, excluding transfers". A chart that silently mixes accounts
   * or currencies destroys trust the first time a user checks the maths.
   */
  basis: string;
  trend?: TrendPoint[];
  comparisonLabel?: string;
  comparisonDelta?: number;
  budget?: Money;
  chart?: ChartKind;
  loading?: boolean;
  locale?: string;
  /** Groups the long tail into a single "Other" slice. */
  maxSlices?: number;
  onCategoryPress?: (datum: CategoryDatum) => void;
  onPeriodPress?: () => void;
}

/**
 * Spending composition with an always-available text alternative.
 *
 * The accessible table is a first-class toggle rather than a hidden fallback —
 * plenty of sighted users also just want the exact numbers.
 */
export const SpendingCategoryChart = ({
  data,
  total,
  periodLabel,
  basis,
  trend,
  comparisonLabel,
  comparisonDelta,
  budget,
  chart = 'donut',
  loading = false,
  locale = 'en-IN',
  maxSlices = 6,
  onCategoryPress,
  onPeriodPress,
  animated = true,
  style,
  containerStyle,
  testID,
}: SpendingCategoryChartProps) => {
  const theme = useAppTheme();
  const [view, setView] = useState<'chart' | 'table'>('chart');
  const [kind, setKind] = useState<ChartKind>(chart);

  /** Long tail collapses into "Other" so the donut stays legible. */
  const slices = useMemo(() => {
    if (data.length <= maxSlices) return data;
    const head = data.slice(0, maxSlices - 1);
    const tail = data.slice(maxSlices - 1);
    const other: CategoryDatum = {
      id: 'other',
      label: `Other (${tail.length})`,
      value: {
        minorUnits: tail.reduce((sum, d) => sum + d.value.minorUnits, 0),
        currency: total.currency,
      },
      percentage: tail.reduce((sum, d) => sum + d.percentage, 0),
      colorToken: 'chartOther',
      transactionCount: tail.reduce((sum, d) => sum + (d.transactionCount ?? 0), 0),
    };
    return [...head, other];
  }, [data, maxSlices, total.currency]);

  if (loading) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(testID, 'loading')}>
        <SkeletonLoader shape="circle" height={160} />
        <SkeletonLoader shape="text" lines={4} containerStyle={{ marginTop: 16 }} />
      </AppCard>
    );
  }

  if (data.length === 0) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle}>
        <StateView
          preset="empty"
          compact
          title="Nothing to show for this period"
          description={`No ${basis.toLowerCase()} found for ${periodLabel}.`}
          testID={childTestID(testID, 'empty')}
        />
      </AppCard>
    );
  }

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={testID}>
      <View style={styles.headerRow}>
        <View style={styles.flex}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {periodLabel}
          </Text>
          <Text variant="headlineSmall" style={styles.tabular}>
            {formatMoney(total, { locale })}
          </Text>
          {/* The calculation basis is always visible, never buried in a tooltip. */}
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {basis}
          </Text>
        </View>
        {onPeriodPress ? (
          <IconButton icon="calendar" onPress={onPeriodPress} accessibilityLabel="Change period" />
        ) : null}
      </View>

      {comparisonLabel && comparisonDelta != null ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {comparisonDelta >= 0 ? '↑' : '↓'} {Math.abs(comparisonDelta).toFixed(0)}% vs {comparisonLabel}
        </Text>
      ) : null}

      {budget ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
          Budget {formatMoney(budget, { locale })}
          {total.minorUnits > budget.minorUnits ? ' · over budget' : ''}
        </Text>
      ) : null}

      <SegmentedButtons
        value={view}
        onValueChange={(next) => setView(next as 'chart' | 'table')}
        style={{ marginVertical: theme.spacing.md }}
        buttons={[
          { value: 'chart', label: 'Chart', icon: 'chart-donut' },
          { value: 'table', label: 'Values', icon: 'table' },
        ]}
      />

      {view === 'table' ? (
        <AccessibleDataTable data={slices} locale={locale} testID={childTestID(testID, 'table')} />
      ) : (
        <>
          {trend?.length && kind === 'bar' ? (
            <BarChart data={trend} locale={locale} animated={animated} testID={childTestID(testID, 'bar')} />
          ) : (
            <View style={styles.chartWrap}>
              <DonutChart
                data={slices}
                onSegmentPress={onCategoryPress}
                testID={childTestID(testID, 'donut')}
                center={
                  <>
                    <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      Total
                    </Text>
                    <Text variant="titleMedium" style={styles.tabular}>
                      {formatMoney(total, { locale, omitSymbol: true })}
                    </Text>
                  </>
                }
              />
            </View>
          )}

          {trend?.length ? (
            <SegmentedButtons
              value={kind}
              onValueChange={(next) => setKind(next as ChartKind)}
              style={{ marginVertical: theme.spacing.sm }}
              density="small"
              buttons={[
                { value: 'donut', label: 'By category' },
                { value: 'bar', label: 'Over time' },
              ]}
            />
          ) : null}

          <CategoryLegend
            data={slices}
            locale={locale}
            onCategoryPress={onCategoryPress}
            testID={childTestID(testID, 'legend')}
          />
        </>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  chartWrap: { alignItems: 'center', paddingVertical: 8 },
});
