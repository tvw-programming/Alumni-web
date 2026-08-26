import ReplayIcon from '@mui/icons-material/Replay';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import {
  describe,
  formatMoney,
  statusOf,
  timeLabel,
  useAction,
  type Money,
  type StatusMap,
  type TransactionId,
} from '../../../foundation';

export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded' | 'reversed';

export interface Transaction {
  id: TransactionId;
  merchant: string;
  amount: Money;
  direction: 'debit' | 'credit';
  status: TransactionStatus;
  date: string;
  category?: string;
  iconUri?: string;
}

export interface TransactionListItemProps {
  transaction: Transaction;
  onPress: () => void;
  onRetry?: () => Promise<void>;
}

const TRANSACTION_STATUS: StatusMap<TransactionStatus> = {
  pending: { label: 'Pending', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  refunded: { label: 'Refunded', color: 'info' },
  reversed: { label: 'Reversed', color: 'info' },
};

/**
 * One row of a statement.
 *
 * The sign is text and the status is text. A red amount and a green amount are
 * the same amount to a screen reader, and "−₹450" is announced by several as
 * "hyphen 450" — so the row's label says "Debit, 450 rupees, pending".
 *
 * A locally inserted row (a payment the user just made) is legitimate *only*
 * while it is visibly marked pending. Completion comes from the backend; this
 * component never promotes a row to "completed" on its own.
 */
export const TransactionListItem = memo(function TransactionListItem({
  transaction,
  onPress,
  onRetry,
}: TransactionListItemProps) {
  const [, retry, retrying] = useAction<void, 'retried'>(async () => {
    await onRetry?.();
    return 'retried';
  });

  const presentation = statusOf(TRANSACTION_STATUS, transaction.status);
  const isDebit = transaction.direction === 'debit';
  const sign = isDebit ? '−' : '+';
  const settled = transaction.status === 'completed';

  return (
    <ListItemButton
      onClick={onPress}
      sx={{ alignItems: 'flex-start', gap: 1.5, py: 1.25 }}
      aria-label={describe(
        transaction.merchant,
        isDebit ? 'Debit' : 'Credit',
        formatMoney(transaction.amount),
        presentation.label,
        timeLabel(transaction.date),
        transaction.category,
      )}
    >
      <Avatar src={transaction.iconUri} alt="" sx={{ width: 36, height: 36 }}>
        {transaction.merchant.charAt(0)}
      </Avatar>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap aria-hidden>
          {transaction.merchant}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {timeLabel(transaction.date)}
          </Typography>
          {transaction.category ? (
            <Chip size="small" variant="outlined" label={transaction.category} aria-hidden />
          ) : null}
        </Stack>
      </Box>

      <Stack alignItems="flex-end" spacing={0.5}>
        <Typography
          variant="body2"
          fontWeight={700}
          aria-hidden
          sx={{
            fontVariantNumeric: 'tabular-nums',
            color: settled && !isDebit ? 'success.main' : 'text.primary',
            textDecoration: transaction.status === 'failed' ? 'line-through' : 'none',
          }}
        >
          {`${sign}${formatMoney(transaction.amount)}`}
        </Typography>

        {/* Always rendered for a non-completed row, never colour alone. */}
        {!settled ? (
          <Chip
            size="small"
            label={presentation.label}
            color={presentation.color}
            variant="outlined"
            aria-hidden
          />
        ) : null}
      </Stack>

      {onRetry && transaction.status === 'failed' ? (
        <IconButton
          size="small"
          aria-label={`Retry payment to ${transaction.merchant}`}
          disabled={retrying}
          onClick={(event) => {
            event.stopPropagation();
            retry();
          }}
        >
          <ReplayIcon fontSize="small" />
        </IconButton>
      ) : null}
    </ListItemButton>
  );
});
