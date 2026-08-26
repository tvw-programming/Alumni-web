/**
 * USAGE — TransactionListItem
 *
 * Shows the row inside a real virtualised list with date grouping, swipe
 * actions and a detail sheet — i.e. how it is actually consumed, not a static
 * gallery.
 */
import React, { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';

import { PaginatedList } from '@ui/organisms/PaginatedList';
import { LIST_ITEM_HEIGHTS } from '@ui/molecules/ListItemRow';
import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { formatMoney } from '../types/money';
import type { Transaction } from '../types/domain';
import { TransactionListItem, describeTransaction } from './TransactionListItem';
import { TransactionGroupHeader, groupTransactionsByDate } from './TransactionGroup';
import sample from './TransactionListItem.sample.json';

const { transactions } = loadSample<{ transactions: Transaction[] }>(sample);

/** Flattened group headers + rows, so one FlashList renders the whole statement. */
type Row = { type: 'header'; key: string; label: string } | { type: 'item'; key: string; item: Transaction };

export const TransactionListItemUsage = () => {
  const theme = useAppTheme();
  const sheet = useSheet();
  const toast = useToast();

  const rows = useMemo<Row[]>(() => {
    return groupTransactionsByDate(transactions).flatMap((group) => [
      { type: 'header' as const, key: `h-${group.key}`, label: group.label },
      ...group.items.map((item) => ({ type: 'item' as const, key: item.id, item })),
    ]);
  }, []);

  const openDetail = useCallback(
    (transaction: Transaction) => {
      sheet.open(
        <View style={{ gap: theme.spacing.sm }}>
          <Text variant="headlineSmall">{formatMoney(transaction.amount)}</Text>
          <Text variant="bodyMedium">{transaction.merchantName}</Text>
          {transaction.statusExplanation ? (
            // Pending needs an explanation, not just a label.
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {transaction.statusExplanation}
            </Text>
          ) : null}
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {describeTransaction(transaction)}
          </Text>
        </View>,
        { title: 'Transaction', variant: 'bottom' },
      );
    },
    [sheet, theme],
  );

  return (
    <PaginatedList<Row>
      data={rows}
      estimatedItemSize={LIST_ITEM_HEIGHTS.md}
      keyExtractor={(row) => row.key}
      renderItem={({ item, index }) =>
        item.type === 'header' ? (
          <TransactionGroupHeader label={item.label} />
        ) : (
          <TransactionListItem
            transaction={item.item}
            density="history"
            index={index}
            entering="slideUp"
            onPress={openDetail}
            // Swipe actions mirror menu actions — never swipe-only.
            swipeActions={{
              right: [
                {
                  key: 'dispute',
                  label: 'Dispute',
                  icon: 'gavel',
                  intent: 'error',
                  onPress: () => toast.warning(`Disputing ${item.item.merchantName}`),
                },
              ],
            }}
          />
        )
      }
      emptyState={{ preset: 'empty', title: 'No transactions yet' }}
      testID="txn-usage-list"
    />
  );
};
