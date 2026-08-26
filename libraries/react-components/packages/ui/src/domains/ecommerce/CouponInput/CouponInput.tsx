import CloseIcon from '@mui/icons-material/Close';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormHelperText from '@mui/material/FormHelperText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import { useId } from 'react';

import { formatMoney, statusOf, type Money, type StatusMap } from '../../../foundation';

export type CouponState = 'idle' | 'validating' | 'applied' | 'invalid' | 'expired' | 'error';

export interface CouponInputProps {
  value: string;
  state: CouponState;
  /** The server's wording. Specific beats "Invalid code". */
  message?: string;
  discount?: Money;
  onChange: (value: string) => void;
  onApply: () => Promise<void>;
  onRemove?: () => Promise<void>;
}

const COUPON_STATUS: StatusMap<CouponState> = {
  idle: { label: '', color: 'default' },
  validating: { label: 'Checking…', color: 'default' },
  applied: { label: 'Applied', color: 'success' },
  invalid: { label: 'Not valid', color: 'error' },
  expired: { label: 'Expired', color: 'warning' },
  error: { label: 'Could not check', color: 'error' },
};

/**
 * Promo code entry.
 *
 * The behaviour that matters is what happens on failure: **the code is not
 * cleared and focus is not moved**. Clearing it forces the user to retype a
 * fifteen-character string to fix a typo, which is the single most common
 * complaint about coupon fields.
 *
 * State is controlled by the parent rather than owned here, because the applied
 * discount changes the cart totals and those live above this component. The
 * parent runs the Action (typically `useAction`) and passes the outcome down —
 * see `usage.tsx`.
 */
export function CouponInput({
  value,
  state,
  message,
  discount,
  onChange,
  onApply,
  onRemove,
}: CouponInputProps) {
  const helperId = useId();
  const applied = state === 'applied';
  const busy = state === 'validating';
  const failed = state === 'invalid' || state === 'expired' || state === 'error';
  const status = statusOf(COUPON_STATUS, state);

  if (applied) {
    return (
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Chip
          icon={<LocalOfferIcon />}
          color="success"
          label={discount ? `${value} · ${formatMoney(discount)} off` : `${value} applied`}
          onDelete={onRemove ? () => void onRemove() : undefined}
          deleteIcon={<CloseIcon />}
        />
        {message ? (
          <FormHelperText sx={{ color: 'success.main' }} role="status">
            {message}
          </FormHelperText>
        ) : null}
      </Stack>
    );
  }

  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          label="Promo code"
          value={value}
          error={failed}
          disabled={busy}
          inputProps={{
            'aria-describedby': helperId,
            autoCapitalize: 'characters',
            autoCorrect: 'off',
            spellCheck: false,
          }}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && value.trim() !== '') {
              event.preventDefault();
              void onApply();
            }
          }}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="outlined"
          disabled={busy || value.trim() === ''}
          startIcon={busy ? <CircularProgress size={14} /> : undefined}
          onClick={() => void onApply()}
          sx={{ mt: 0.25 }}
        >
          {busy ? 'Checking' : 'Apply'}
        </Button>
      </Stack>

      {/* Reserved height, so a message appearing cannot push the checkout
          button down under the user's cursor. */}
      <FormHelperText
        id={helperId}
        role={failed ? 'alert' : 'status'}
        error={failed}
        sx={{ minHeight: 20, m: 0 }}
      >
        {message ?? status.label}
      </FormHelperText>
    </Stack>
  );
}
