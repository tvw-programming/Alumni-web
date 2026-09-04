import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatMoney, moneyLabel, useAction, type Money } from '../../../foundation';

export type PaymentPhase =
  'review' | 'authenticating' | 'submitted' | 'completed' | 'pending' | 'failed';

export interface PaymentConfirmationProps {
  open: boolean;
  amount: Money;
  recipient: string;
  fundingSource: string;
  fee?: Money;
  riskNotice?: string;
  /** Resolves with the phase the server reports. Never assumed. */
  onConfirm: () => Promise<PaymentPhase>;
  onCancel: () => void;
}

const PHASE_COPY: Record<
  PaymentPhase,
  { title: string; body?: string; severity?: 'success' | 'info' | 'error' }
> = {
  review: { title: 'Review payment' },
  authenticating: { title: 'Authenticating…', body: 'Confirm on your device.' },
  submitted: {
    title: 'Payment submitted',
    body: 'Your bank has accepted the request. We will update this when it settles.',
    severity: 'info',
  },
  completed: {
    title: 'Payment completed',
    body: 'The money has left your account.',
    severity: 'success',
  },
  pending: {
    title: 'Payment pending',
    body: 'This is taking longer than usual. Do not send it again — check your statement first.',
    severity: 'info',
  },
  failed: { title: 'Payment failed', body: 'No money has left your account.', severity: 'error' },
};

/**
 * The last screen before money moves.
 *
 * The whole design rule is in the phase list: **"submitted" is not
 * "completed"**. A bank that has accepted a request has not necessarily settled
 * it, and an app that says "Sent!" on acceptance teaches users to stop checking
 * — then a failed settlement is discovered days later.
 *
 * `useActionState` carries the phase, and the phase comes from the server. The
 * dialog cannot be dismissed while the Action is in flight, because a user who
 * closes mid-payment and retries is a user who pays twice.
 */
export function PaymentConfirmation({
  open,
  amount,
  recipient,
  fundingSource,
  fee,
  riskNotice,
  onConfirm,
  onCancel,
}: PaymentConfirmationProps) {
  const [result, confirm, pending] = useAction<void, PaymentPhase>(async () => onConfirm());

  const phase: PaymentPhase = pending
    ? 'authenticating'
    : result.status === 'success'
      ? result.data
      : result.status === 'error'
        ? 'failed'
        : 'review';

  const copy = PHASE_COPY[phase];
  const settled =
    phase === 'completed' || phase === 'failed' || phase === 'pending' || phase === 'submitted';

  return (
    <Dialog
      open={open}
      // Not dismissable while in flight: closing mid-payment and retrying is
      // how a user pays twice.
      onClose={pending ? undefined : onCancel}
      disableEscapeKeyDown={pending}
      maxWidth="xs"
      fullWidth
      aria-labelledby="payment-confirmation-title"
    >
      <DialogTitle id="payment-confirmation-title">{copy.title}</DialogTitle>

      <DialogContent>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline">
            <Typography variant="body2" color="text.secondary" aria-hidden>
              Amount
            </Typography>
            <Typography variant="h5" fontWeight={700} aria-label={moneyLabel('Amount', amount)}>
              {formatMoney(amount)}
            </Typography>
          </Stack>

          <Divider />

          <Row label="To" value={recipient} />
          <Row label="From" value={fundingSource} />
          {fee ? (
            <Row label="Fee" value={formatMoney(fee)} announce={moneyLabel('Fee', fee)} />
          ) : null}

          {riskNotice ? (
            <Alert severity="warning" icon={<WarningAmberIcon />}>
              {riskNotice}
            </Alert>
          ) : null}

          {copy.body ? (
            <Alert severity={copy.severity ?? 'info'} role="status">
              {copy.body}
            </Alert>
          ) : null}

          {result.status === 'error' ? (
            <Typography variant="caption" color="error.main" role="alert">
              {result.message}
            </Typography>
          ) : null}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCancel} disabled={pending}>
          {settled ? 'Close' : 'Cancel'}
        </Button>
        {!settled ? (
          <Button
            variant="contained"
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => {
              confirm();
            }}
          >
            {pending ? 'Confirming…' : `Pay ${formatMoney(amount)}`}
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

function Row({ label, value, announce }: { label: string; value: string; announce?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary" aria-hidden>
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={600}
        sx={{ textAlign: 'right' }}
        aria-label={announce ?? `${label}, ${value}`}
      >
        {value}
      </Typography>
    </Stack>
  );
}
