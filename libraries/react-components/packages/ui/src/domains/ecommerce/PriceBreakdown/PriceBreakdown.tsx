import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { formatMoney, moneyLabel, type Money } from '../../../foundation';

export interface PriceLine {
  label: string;
  amount: Money;
  /** Shown behind an info affordance — never used to hide a mandatory fee. */
  note?: string;
  emphasis?: boolean;
}

export interface PriceBreakdownProps {
  lines: PriceLine[];
  total: Money;
  totalLabel?: string;
  /** Rendered under the total: "Includes ₹305 tax". */
  footnote?: string;
  dense?: boolean;
}

/**
 * A read-only money list, shared by cart, checkout, booking and fare screens.
 *
 * Deliberately dumb: it takes computed lines and prints them. The moment a
 * breakdown component starts adding numbers up, two places in the codebase know
 * how a total is made — and they drift.
 *
 * **Every mandatory fee is a line.** A "service fee" revealed on the payment
 * screen is the pattern regulators call drip pricing; this component gives it
 * nowhere to hide.
 */
export function PriceBreakdown({
  lines,
  total,
  totalLabel = 'Total',
  footnote,
  dense = false,
}: PriceBreakdownProps) {
  return (
    <Box>
      <Stack spacing={dense ? 0.5 : 1}>
        {lines.map((line) => (
          <Stack key={line.label} direction="row" alignItems="center" spacing={1}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ flexGrow: 1 }}>
              <Typography
                variant="body2"
                color={line.emphasis ? 'text.primary' : 'text.secondary'}
                fontWeight={line.emphasis ? 600 : 400}
                aria-hidden
              >
                {line.label}
              </Typography>
              {line.note ? (
                <Tooltip title={line.note}>
                  <InfoOutlinedIcon
                    fontSize="inherit"
                    color="disabled"
                    // The note is already in the row's hidden label, so the
                    // icon itself is decorative.
                    aria-hidden
                  />
                </Tooltip>
              ) : null}
            </Stack>

            <Typography
              variant="body2"
              fontWeight={line.emphasis ? 600 : 400}
              color={line.amount.amountMinor < 0n ? 'success.main' : 'text.primary'}
              aria-hidden
              sx={{ fontVariantNumeric: 'tabular-nums' }}
            >
              {formatMoney(line.amount)}
            </Typography>

            <Box component="span" sx={hidden}>
              {moneyLabel(line.label, line.amount)}
              {line.note ? `. ${line.note}` : ''}
            </Box>
          </Stack>
        ))}
      </Stack>

      <Divider sx={{ my: dense ? 1 : 1.5 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="subtitle2" fontWeight={700} aria-hidden>
          {totalLabel}
        </Typography>
        <Typography
          variant="subtitle1"
          fontWeight={700}
          aria-hidden
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {formatMoney(total)}
        </Typography>
        <Box component="span" sx={hidden}>
          {moneyLabel(totalLabel, total)}
        </Box>
      </Stack>

      {footnote ? (
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          {footnote}
        </Typography>
      ) : null}
    </Box>
  );
}

const hidden = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
} as const;
