/**
 * USAGE — SpendingCategoryChart + CategoryLegend
 *
 * Tapping a category filters the transaction list, which is the behaviour that
 * makes the chart useful rather than decorative.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CategoryDatum } from '../types/domain';
import type { Money } from '../types/money';
import { SpendingCategoryChart } from './SpendingCategoryChart';
import type { TrendPoint } from './BarChart';
import sample from './SpendingCategoryChart.sample.json';

const data = loadSample<{
  periodLabel: string;
  basis: string;
  total: Money;
  budget: Money;
  comparisonLabel: string;
  comparisonDelta: number;
  categories: CategoryDatum[];
  trend: TrendPoint[];
}>(sample);

export const SpendingCategoryChartUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [filtered, setFiltered] = useState<CategoryDatum | null>(null);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SpendingCategoryChart
        data={data.categories}
        total={data.total}
        periodLabel={data.periodLabel}
        basis={data.basis}
        budget={data.budget}
        comparisonLabel={data.comparisonLabel}
        comparisonDelta={data.comparisonDelta}
        trend={data.trend}
        // 9 categories, 6 slices — the tail collapses into "Other" automatically.
        maxSlices={6}
        onCategoryPress={(datum) => {
          setFiltered(datum);
          toast.show(`Filtering by ${datum.label}`);
        }}
        onPeriodPress={() => toast.show('Opening period picker')}
        testID="spending-chart"
      />

      {filtered ? (
        <AppCard variant="filled" title={`Filtered: ${filtered.label}`}>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {filtered.transactionCount ?? 0} transactions · {filtered.percentage.toFixed(1)}% of spending. In the real app
            this drives the statement list below the chart.
          </Text>
        </AppCard>
      ) : null}

      <SpendingCategoryChart
        data={[]}
        total={{ minorUnits: 0, currency: 'INR' }}
        periodLabel="September 2026"
        basis="Card spending only"
        testID="spending-chart-empty"
      />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
