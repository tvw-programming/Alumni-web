import List from '@mui/material/List';

import { asId, parseMoney, type TransactionId } from '../../../foundation';

import sample from './sample.json';
import { TransactionListItem, type Transaction } from './TransactionListItem';

export function TransactionListItemUsage() {
  const transaction: Transaction = {
    id: asId<TransactionId>(sample.transaction.id),
    merchant: sample.transaction.merchant,
    amount: parseMoney(sample.transaction.amount),
    direction: 'debit',
    status: 'pending',
    date: sample.transaction.date,
    category: sample.transaction.category,
  };

  return (
    <List disablePadding>
      <TransactionListItem
        transaction={transaction}
        onPress={() => {
          // open the transaction detail
        }}
        // Only offered on a failed row. Retrying must carry the original
        // idempotency key so the bank does not take the money twice.
        onRetry={async () => {
          await fetch(`/api/transactions/${transaction.id}/retry`, { method: 'POST' });
        }}
      />
    </List>
  );
}
