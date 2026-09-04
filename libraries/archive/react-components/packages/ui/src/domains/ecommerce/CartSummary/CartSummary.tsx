import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatMoney, moneyLabel, useAction, type Money } from '../../../foundation';

export interface CartTotals {
  subtotal: Money;
  discounts?: Money;
  shipping?: Money;
  tax?: Money;
  serviceFee?: Money;
  total: Money;
}

export interface CartSummaryProps {
  totals: CartTotals;
  /** True while the server is recalculating after a line change. */
  recalculating?: boolean;
  /** Set when the server returned totals different from the ones shown. */
  changedNotice?: string;
  itemCount?: number;
  onCheckout: () => Promise<void>;
}

interface Row {
  label: string;
  value: Money;
  emphasis?: boolean;
}

/**
 * The money panel. Every figure here is the server's.
 *
 * This component deliberately computes nothing. Subtotal, discount, shipping,
 * tax and total arrive already calculated, because tax and shipping rules
 * depend on address, weight, promotions and jurisdiction — and a client that
 * approximates them will eventually display a number the payment does not
 * match.
 *
 * `useActionState` for checkout, with no optimistic anything: "your cart
 * changed" is a real outcome, and the user has to see the new totals before the
 * charge.
 */
export function CartSummary({
  totals,
  recalculating = false,
  changedNotice,
  itemCount,
  onCheckout,
}: CartSummaryProps) {
  const [result, checkout, pending] = useAction<void, 'started'>(async () => {
    await onCheckout();
    return 'started';
  });

  const rows: Row[] = [
    { label: 'Subtotal', value: totals.subtotal },
    ...(totals.discounts ? [{ label: 'Discounts', value: totals.discounts }] : []),
    ...(totals.shipping ? [{ label: 'Shipping', value: totals.shipping }] : []),
    ...(totals.tax ? [{ label: 'Tax', value: totals.tax }] : []),
    ...(totals.serviceFee ? [{ label: 'Service fee', value: totals.serviceFee }] : []),
  ];

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Order summary
        {itemCount !== undefined ? (
          <Typography component="span" variant="body2" color="text.secondary">
            {` · ${String(itemCount)} item${itemCount === 1 ? '' : 's'}`}
          </Typography>
        ) : null}
      </Typography>

      {/* An authoritative correction, not an error: the server recalculated and
          disagreed with what was on screen. */}
      {changedNotice ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          {changedNotice}
        </Alert>
      ) : null}

      <Stack spacing={1} sx={{ opacity: recalculating ? 0.6 : 1 }} aria-busy={recalculating}>
        {rows.map((row) => (
          <Stack key={row.label} direction="row" justifyContent="space-between">
            {/* The visible text is "-₹100"; the announced text is
                "Discounts, minus 100 rupees" — several screen readers read a
                leading hyphen as the word "hyphen". */}
            <Typography variant="body2" color="text.secondary" aria-hidden>
              {row.label}
            </Typography>
            <Typography variant="body2" aria-hidden>
              {formatMoney(row.value)}
            </Typography>
            <Box component="span" sx={visuallyHidden}>
              {moneyLabel(row.label, row.value)}
            </Box>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="subtitle1" fontWeight={700} aria-hidden>
          Total
        </Typography>
        <Typography variant="h6" fontWeight={700} aria-hidden>
          {recalculating ? <CircularProgress size={18} /> : formatMoney(totals.total)}
        </Typography>
        <Box component="span" sx={visuallyHidden}>
          {moneyLabel('Total', totals.total)}
        </Box>
      </Stack>

      <Button
        fullWidth
        size="large"
        variant="contained"
        sx={{ mt: 2 }}
        disabled={pending || recalculating}
        onClick={() => {
          checkout();
        }}
      >
        {pending ? 'Starting checkout…' : 'Checkout'}
      </Button>

      <Box aria-live="polite" sx={{ mt: 1 }}>
        {result.status === 'error' || result.status === 'conflict' ? (
          <Typography variant="caption" color="error.main">
            {result.message}
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}

/** Clip-based hiding: still read aloud, never displayed, no layout effect. */
const visuallyHidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
