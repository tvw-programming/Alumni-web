import BackspaceOutlinedIcon from '@mui/icons-material/BackspaceOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { formatMoney, money, moneyLabel, type Money } from '../../../foundation';

export interface AmountKeypadProps {
  /** Minor units as a digit string, so no float ever exists. */
  value: string;
  currency: string;
  max?: Money;
  min?: Money;
  helperText?: string;
  onChange: (nextMinorUnits: string) => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'backspace'] as const;

/**
 * A numeric pad for entering an amount.
 *
 * The value is **a string of minor units**, never a number. `"12345"` is
 * ₹123.45, and it stays a string until the moment it becomes a `bigint` — so
 * there is no point at which a float could round it. Typing digits appends;
 * that is also why there is no decimal key.
 *
 * No Action here: entering an amount is not a mutation. The Action belongs to
 * whatever confirms the payment.
 */
export function AmountKeypad({
  value,
  currency,
  max,
  min,
  helperText,
  onChange,
}: AmountKeypadProps) {
  const amount = money(value === '' ? 0n : BigInt(value), currency);
  const overMax = max !== undefined && amount.amountMinor > max.amountMinor;
  const underMin =
    min !== undefined && amount.amountMinor > 0n && amount.amountMinor < min.amountMinor;

  const press = (key: (typeof KEYS)[number]) => {
    if (key === 'backspace') {
      onChange(value.slice(0, -1));
      return;
    }
    // A leading zero would make "0500" a legal string for ₹5.00, which is a
    // second representation of one amount — and two representations is one too
    // many when they are compared for equality.
    const next = `${value}${key}`.replace(/^0+(?=\d)/, '');
    if (next.length > 12) return;
    onChange(next);
  };

  return (
    <Stack spacing={2}>
      <Box sx={{ textAlign: 'center' }}>
        <Typography
          variant="h3"
          fontWeight={700}
          sx={{ fontVariantNumeric: 'tabular-nums' }}
          // A live region: the amount changes as keys are pressed, and the user
          // needs to hear the running total rather than each digit.
          aria-live="polite"
          aria-label={moneyLabel('Amount', amount)}
        >
          {formatMoney(amount)}
        </Typography>
        <Typography
          variant="caption"
          color={overMax || underMin ? 'error.main' : 'text.secondary'}
          role={overMax || underMin ? 'alert' : undefined}
        >
          {overMax
            ? `Maximum ${formatMoney(max)}`
            : underMin
              ? `Minimum ${formatMoney(min)}`
              : helperText}
        </Typography>
      </Box>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 1,
          maxWidth: 320,
          mx: 'auto',
          width: '100%',
        }}
      >
        {KEYS.map((key) => (
          <Button
            key={key}
            variant="outlined"
            size="large"
            aria-label={key === 'backspace' ? 'Delete last digit' : key}
            onClick={() => {
              press(key);
            }}
            sx={{ py: 1.5, fontSize: 20, fontWeight: 600 }}
          >
            {key === 'backspace' ? <BackspaceOutlinedIcon /> : key}
          </Button>
        ))}
      </Box>
    </Stack>
  );
}
