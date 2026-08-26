import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import WalletIcon from '@mui/icons-material/Wallet';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, formatMoney, type Money } from '../../../foundation';

export type PaymentMethodKind = 'card' | 'bank' | 'wallet' | 'upi';

export interface PaymentMethod {
  id: string;
  kind: PaymentMethodKind;
  label: string;
  /** Last four digits or a handle. Never the full number. */
  hint: string;
  balance?: Money;
  expiresOn?: string;
  /** Set when this method cannot be used for this payment. */
  unavailableReason?: string;
}

export interface PaymentMethodSelectorProps {
  methods: PaymentMethod[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

const ICONS: Record<PaymentMethodKind, typeof CreditCardIcon> = {
  card: CreditCardIcon,
  bank: AccountBalanceIcon,
  wallet: WalletIcon,
  upi: AccountBalanceIcon,
};

/**
 * Choosing how to pay.
 *
 * `hint` is a last-four or a handle and never the full instrument number — a
 * component that can render a PAN is a component that will eventually render
 * one into a log or a screenshot.
 *
 * Selection is local: it is not a mutation, and the payment Action that follows
 * is where the server gets a say.
 */
export function PaymentMethodSelector({
  methods,
  selectedId,
  onSelect,
}: PaymentMethodSelectorProps) {
  return (
    <RadioGroup
      value={selectedId ?? ''}
      onChange={(event) => {
        onSelect(event.target.value);
      }}
    >
      <Stack spacing={1}>
        {methods.map((method) => {
          const Icon = ICONS[method.kind];
          const disabled = method.unavailableReason !== undefined;

          return (
            <Paper
              key={method.id}
              variant="outlined"
              sx={{
                px: 1.5,
                py: 1,
                borderColor: method.id === selectedId ? 'primary.main' : 'divider',
                opacity: disabled ? 0.6 : 1,
              }}
            >
              <FormControlLabel
                value={method.id}
                disabled={disabled}
                control={<Radio />}
                sx={{ m: 0, width: '100%' }}
                label={
                  <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 0.5 }}>
                    <Icon fontSize="small" color="action" />
                    <Stack sx={{ minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {method.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {method.hint}
                        {method.expiresOn ? ` · expires ${method.expiresOn}` : ''}
                      </Typography>
                      {method.unavailableReason ? (
                        <Typography variant="caption" color="error.main">
                          {method.unavailableReason}
                        </Typography>
                      ) : null}
                    </Stack>
                    {method.balance ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={formatMoney(method.balance)}
                        sx={{ ml: 'auto' }}
                      />
                    ) : null}
                  </Stack>
                }
                slotProps={{
                  typography: {
                    'aria-label': describe(
                      method.label,
                      method.hint,
                      method.balance ? `balance ${formatMoney(method.balance)}` : undefined,
                      method.unavailableReason,
                    ),
                  },
                }}
              />
            </Paper>
          );
        })}
      </Stack>
    </RadioGroup>
  );
}
