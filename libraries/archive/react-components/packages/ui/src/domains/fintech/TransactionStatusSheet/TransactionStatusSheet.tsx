import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatMoney, moneyLabel, timeLabel, type Money } from '../../../foundation';

export type TransactionOutcome = 'success' | 'pending' | 'failed';

export interface TransactionStatusSheetProps {
  open: boolean;
  outcome: TransactionOutcome;
  amount: Money;
  recipient: string;
  /** The bank's reference. The one thing support will ask for. */
  reference?: string;
  completedAt?: string;
  failureReason?: string;
  onClose: () => void;
  onRetry?: () => void;
  onContactSupport?: () => void;
}

const OUTCOME = {
  success: { icon: CheckCircleIcon, color: 'success.main', title: 'Payment successful' },
  pending: { icon: HourglassTopIcon, color: 'warning.main', title: 'Payment pending' },
  failed: { icon: ErrorIcon, color: 'error.main', title: 'Payment failed' },
} as const;

/**
 * The receipt.
 *
 * Two things earn their place here: the **reference**, because it is the first
 * thing support asks for, and an explicit statement of **whether money left the
 * account**. A failure screen that does not answer that leaves the user to
 * check their statement in a panic.
 */
export function TransactionStatusSheet({
  open,
  outcome,
  amount,
  recipient,
  reference,
  completedAt,
  failureReason,
  onClose,
  onRetry,
  onContactSupport,
}: TransactionStatusSheetProps) {
  const presentation = OUTCOME[outcome];
  const Icon = presentation.icon;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogContent>
        <Stack spacing={2} alignItems="center" sx={{ pt: 2 }}>
          <Icon sx={{ fontSize: 56, color: presentation.color }} aria-hidden />

          {/* One announcement carries the outcome, the amount and the money
              question — not three separate fragments. */}
          <Typography
            variant="h6"
            role="status"
            aria-label={`${presentation.title}. ${moneyLabel('Amount', amount)}. ${
              outcome === 'failed'
                ? 'No money has left your account.'
                : outcome === 'pending'
                  ? 'The money has been debited and is being confirmed.'
                  : 'The money has left your account.'
            }`}
          >
            {presentation.title}
          </Typography>

          <Typography variant="h4" fontWeight={700} aria-hidden>
            {formatMoney(amount)}
          </Typography>
          <Typography variant="body2" color="text.secondary" aria-hidden>
            {`to ${recipient}`}
          </Typography>

          {outcome === 'failed' ? (
            <Typography variant="body2" color="error.main" textAlign="center">
              {failureReason ?? 'The payment did not go through.'}
              {' No money has left your account.'}
            </Typography>
          ) : null}

          {outcome === 'pending' ? (
            <Typography variant="body2" color="text.secondary" textAlign="center">
              This can take a few minutes. Do not pay again — check your statement first.
            </Typography>
          ) : null}

          <Divider flexItem />

          <Box sx={{ width: '100%' }}>
            {reference ? <DetailRow label="Reference" value={reference} /> : null}
            {completedAt ? <DetailRow label="Time" value={timeLabel(completedAt)} /> : null}
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        {onContactSupport && outcome !== 'success' ? (
          <Button onClick={onContactSupport}>Contact support</Button>
        ) : null}
        {onRetry && outcome === 'failed' ? (
          <Button variant="outlined" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
        <Button variant="contained" onClick={onClose}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" sx={{ py: 0.5 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
        {value}
      </Typography>
    </Stack>
  );
}
