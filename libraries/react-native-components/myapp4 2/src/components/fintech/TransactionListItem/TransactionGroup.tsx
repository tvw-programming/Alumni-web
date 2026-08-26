import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { formatMoney, type Money } from '../types/money';
import type { Transaction } from '../types/domain';

export interface TransactionGroupHeaderProps {
  label: string;
  /** Optional net total for the group. */
  total?: Money;
  locale?: string;
  testID?: string;
}

export const TransactionGroupHeader = memo(function TransactionGroupHeader({
  label,
  total,
  locale = 'en-IN',
  testID,
}: TransactionGroupHeaderProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[styles.row, { paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, backgroundColor: theme.colors.background }]}
      accessibilityRole="header"
      testID={testID}
    >
      <Text variant="labelMedium" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
      {total ? (
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatMoney(total, { locale })}
        </Text>
      ) : null}
    </View>
  );
});

export interface TransactionGroup {
  key: string;
  label: string;
  items: Transaction[];
}

/**
 * Groups by Today / Yesterday / This week / localized date.
 * Timezone note: comparison is done on local calendar days, which is what users
 * expect from a statement even though the API timestamps are UTC.
 */
export const groupTransactionsByDate = (
  transactions: Transaction[],
  locale = 'en-IN',
  now: Date = new Date(),
): TransactionGroup[] => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(now);
  const day = 86_400_000;

  const groups = new Map<string, TransactionGroup>();

  for (const transaction of transactions) {
    const date = new Date(transaction.date);
    const bucket = startOfDay(date);
    const diffDays = Math.round((today - bucket) / day);

    let label: string;
    if (diffDays === 0) label = 'Today';
    else if (diffDays === 1) label = 'Yesterday';
    else if (diffDays < 7) label = 'This week';
    else label = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(date);

    const existing = groups.get(label);
    if (existing) existing.items.push(transaction);
    else groups.set(label, { key: label, label, items: [transaction] });
  }

  return [...groups.values()];
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
