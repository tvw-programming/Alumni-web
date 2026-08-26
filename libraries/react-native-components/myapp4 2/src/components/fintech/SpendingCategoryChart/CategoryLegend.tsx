import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { DataTable, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { CHART_SERIES, useFintechTheme, type FintechColorName } from '../theme/fintechTokens';
import { formatMoney } from '../types/money';
import type { CategoryDatum } from '../types/domain';

export interface CategoryLegendProps {
  data: CategoryDatum[];
  locale?: string;
  onCategoryPress?: (datum: CategoryDatum) => void;
  testID?: string;
}

/** Swatch + name + amount + percentage — the chart's meaning in text form. */
export const CategoryLegend = ({ data, locale = 'en-IN', onCategoryPress, testID }: CategoryLegendProps) => {
  const theme = useAppTheme();
  const fintech = useFintechTheme();

  return (
    <View style={{ gap: theme.spacing.xs }} testID={testID}>
      {data.map((datum, index) => {
        const token = (datum.colorToken as FintechColorName | undefined) ?? CHART_SERIES[index % CHART_SERIES.length]!;
        const color = fintech.colors[token] ?? fintech.colors.chartOther;

        return (
          <Pressable
            key={datum.id}
            onPress={onCategoryPress ? () => onCategoryPress(datum) : undefined}
            disabled={!onCategoryPress}
            style={[styles.row, { paddingVertical: theme.spacing.xs, gap: theme.spacing.sm }]}
            accessibilityRole={onCategoryPress ? 'button' : 'text'}
            accessibilityLabel={`${datum.label}, ${formatMoney(datum.value, { locale })}, ${datum.percentage.toFixed(0)} percent${
              datum.transactionCount ? `, ${datum.transactionCount} transactions` : ''
            }`}
            testID={childTestID(testID, `legend-${datum.id}`)}
          >
            <View style={[styles.swatch, { backgroundColor: color, borderRadius: theme.radii.sm }]} />
            <Text variant="bodyMedium" style={styles.flex} numberOfLines={1}>
              {datum.label}
            </Text>
            <Text variant="bodyMedium" style={styles.tabular}>
              {formatMoney(datum.value, { locale })}
            </Text>
            <Text variant="labelSmall" style={[styles.percent, { color: theme.colors.onSurfaceVariant }]}>
              {datum.percentage.toFixed(0)}%
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

export interface AccessibleDataTableProps {
  data: CategoryDatum[];
  locale?: string;
  testID?: string;
}

/**
 * The screen-reader and exact-value path.
 *
 * This is not a nicety — the donut is hidden from assistive tech precisely
 * because this table carries the same information in a form that can be read,
 * sorted and understood without colour vision.
 */
export const AccessibleDataTable = ({ data, locale = 'en-IN', testID }: AccessibleDataTableProps) => (
  <DataTable testID={testID}>
    <DataTable.Header>
      <DataTable.Title>Category</DataTable.Title>
      <DataTable.Title numeric>Amount</DataTable.Title>
      <DataTable.Title numeric>Share</DataTable.Title>
    </DataTable.Header>
    {data.map((datum) => (
      <DataTable.Row key={datum.id}>
        <DataTable.Cell>{datum.label}</DataTable.Cell>
        <DataTable.Cell numeric>{formatMoney(datum.value, { locale })}</DataTable.Cell>
        <DataTable.Cell numeric>{datum.percentage.toFixed(1)}%</DataTable.Cell>
      </DataTable.Row>
    ))}
  </DataTable>
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  swatch: { width: 12, height: 12 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
  percent: { width: 44, textAlign: 'right' },
});
