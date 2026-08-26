import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatMoney, moneyLabel, useAction, type Money } from '../../../foundation';

export type BookingOutcome = 'confirmed' | 'pendingPayment' | 'priceChanged' | 'unavailable';

export interface BookingSummaryLine {
  label: string;
  value: string;
}

export interface BookingSummaryCardProps {
  title: string;
  lines: BookingSummaryLine[];
  total: Money;
  cancellationPolicy?: string;
  /** Resolves with what the server decided. Never assumed. */
  onConfirm: () => Promise<BookingOutcome>;
}

const OUTCOME_COPY: Record<
  BookingOutcome,
  { severity: 'success' | 'info' | 'warning' | 'error'; message: string }
> = {
  confirmed: {
    severity: 'success',
    message: 'Booking confirmed. Your ticket is on its way by email.',
  },
  pendingPayment: {
    severity: 'info',
    message: 'Awaiting payment confirmation. Do not book again — we will update this.',
  },
  priceChanged: {
    severity: 'warning',
    message: 'The price changed before we could confirm. Review the new total and try again.',
  },
  unavailable: {
    severity: 'error',
    message: 'This is no longer available. Nothing has been charged.',
  },
};

/**
 * The review-and-confirm step.
 *
 * Four outcomes, because a booking has four. "Unavailable" and "price changed"
 * are not errors — they are the inventory moving under a user who took ninety
 * seconds to read the page, and each needs its own wording and its own next
 * step.
 *
 * Every non-confirmed outcome answers the money question explicitly, because it
 * is the first thing the user wants to know.
 */
export function BookingSummaryCard({
  title,
  lines,
  total,
  cancellationPolicy,
  onConfirm,
}: BookingSummaryCardProps) {
  const [result, confirm, pending] = useAction<void, BookingOutcome>(async () => onConfirm());

  const outcome = result.status === 'success' ? result.data : undefined;
  const settled = outcome === 'confirmed' || outcome === 'pendingPayment';

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          {title}
        </Typography>

        <Stack spacing={0.75}>
          {lines.map((line) => (
            <Stack key={line.label} direction="row" justifyContent="space-between" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {line.label}
              </Typography>
              <Typography variant="body2" fontWeight={600} sx={{ textAlign: 'right' }}>
                {line.value}
              </Typography>
            </Stack>
          ))}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Stack direction="row" justifyContent="space-between" alignItems="baseline">
          <Typography variant="subtitle2" fontWeight={700} aria-hidden>
            Total
          </Typography>
          <Typography variant="h6" fontWeight={700} aria-label={moneyLabel('Total', total)}>
            {formatMoney(total)}
          </Typography>
        </Stack>

        {cancellationPolicy ? (
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            {cancellationPolicy}
          </Typography>
        ) : null}

        {outcome ? (
          <Alert severity={OUTCOME_COPY[outcome].severity} sx={{ mt: 2 }} role="status">
            {OUTCOME_COPY[outcome].message}
          </Alert>
        ) : null}

        {result.status === 'error' ? (
          <Alert severity="error" sx={{ mt: 2 }} role="alert">
            {`${result.message} Nothing has been charged.`}
          </Alert>
        ) : null}

        {!settled ? (
          <Button
            fullWidth
            size="large"
            variant="contained"
            sx={{ mt: 2 }}
            disabled={pending}
            startIcon={pending ? <CircularProgress size={16} color="inherit" /> : undefined}
            onClick={() => {
              confirm();
            }}
          >
            {pending ? 'Confirming…' : `Confirm and pay ${formatMoney(total)}`}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
