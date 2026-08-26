import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';

import { formatMoney, type Money } from '../../../foundation';

import { PriceBreakdown, type PriceLine } from '../../ecommerce/PriceBreakdown/PriceBreakdown';

export interface FareBreakdownProps {
  lines: PriceLine[];
  total: Money;
  /** Set when the server repriced: the old total, for comparison. */
  previousTotal?: Money;
  /** "Free cancellation until 10 Sep" — stated before payment, not after. */
  cancellationPolicy?: string;
  footnote?: string;
}

/**
 * The fare, with a price-change notice.
 *
 * Reuses `PriceBreakdown` from the e-commerce domain — a fare is a money list,
 * and a second implementation would drift on the accessibility details alone.
 *
 * What travel adds is **repricing**: airlines and hotels change the price
 * between search and payment, and the user must see the old number beside the
 * new one. Silently charging a different total than the one they chose is the
 * complaint that becomes a chargeback.
 */
export function FareBreakdown({
  lines,
  total,
  previousTotal,
  cancellationPolicy,
  footnote,
}: FareBreakdownProps) {
  const changed = previousTotal !== undefined && previousTotal.amountMinor !== total.amountMinor;
  const increased = changed && total.amountMinor > previousTotal.amountMinor;

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        Fare details
      </Typography>

      {changed ? (
        <Alert severity={increased ? 'warning' : 'success'} sx={{ mb: 2 }} role="status">
          {`The price changed from ${formatMoney(previousTotal)} to ${formatMoney(total)} while you were booking.`}
        </Alert>
      ) : null}

      <PriceBreakdown lines={lines} total={total} totalLabel="Total" footnote={footnote} />

      {cancellationPolicy ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
          {cancellationPolicy}
        </Typography>
      ) : null}
    </Paper>
  );
}
