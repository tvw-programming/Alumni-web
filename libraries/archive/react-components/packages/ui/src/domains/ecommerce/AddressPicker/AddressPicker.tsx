import AddIcon from '@mui/icons-material/Add';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Paper from '@mui/material/Paper';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, useAction } from '../../../foundation';

export interface PostalAddress {
  id: string;
  name: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  label?: 'home' | 'work' | 'other';
  isDefault?: boolean;
  /** Set when this address cannot receive this order. */
  unavailableReason?: string;
}

export interface AddressPickerProps {
  addresses: PostalAddress[];
  selectedId?: string;
  onSelect: (id: string) => Promise<void>;
  onAddNew?: () => void;
}

function formatAddress(address: PostalAddress): string {
  return [address.line1, address.line2, `${address.city} ${address.postalCode}`, address.state]
    .filter(Boolean)
    .join(', ');
}

/**
 * Delivery address selection.
 *
 * Selection is optimistic — the radio moves at once and rolls back if the
 * server refuses — because choosing between addresses the server already knows
 * about is a preference, not a transaction. What is *not* optimistic is the
 * consequence: shipping cost and delivery date change with the address, and
 * those are recalculated server-side.
 *
 * An address the courier cannot serve stays listed and disabled with the reason
 * attached. Removing it would leave the user wondering where their address
 * went.
 */
export function AddressPicker({ addresses, selectedId, onSelect, onAddNew }: AddressPickerProps) {
  const [result, select, pending] = useAction<string, string>(async (_previous, id) => {
    await onSelect(id);
    return id;
  });

  // The Action's own value wins while it is in flight; the prop takes over the
  // moment it settles, which is the rollback.
  const activeId = result.status === 'success' && pending ? result.data : selectedId;

  return (
    <Stack spacing={1.5}>
      <RadioGroup
        value={activeId ?? ''}
        onChange={(event) => {
          select(event.target.value);
        }}
      >
        <Stack spacing={1}>
          {addresses.map((address) => {
            const disabled = address.unavailableReason !== undefined;
            return (
              <Paper
                key={address.id}
                variant="outlined"
                sx={{
                  p: 1.5,
                  borderColor: address.id === activeId ? 'primary.main' : 'divider',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                <FormControlLabel
                  value={address.id}
                  disabled={disabled || pending}
                  control={<Radio sx={{ alignSelf: 'flex-start', mt: -0.5 }} />}
                  sx={{ alignItems: 'flex-start', m: 0, width: '100%' }}
                  label={
                    <Box sx={{ pt: 0.25 }}>
                      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <Typography variant="body2" fontWeight={600}>
                          {address.name}
                        </Typography>
                        {address.label ? <Chip size="small" label={address.label} /> : null}
                        {address.isDefault ? (
                          <Chip size="small" color="primary" variant="outlined" label="Default" />
                        ) : null}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatAddress(address)}
                      </Typography>
                      {address.phone ? (
                        <Typography variant="caption" color="text.secondary" display="block">
                          {address.phone}
                        </Typography>
                      ) : null}
                      {address.unavailableReason ? (
                        <Typography variant="caption" color="error.main" display="block">
                          {address.unavailableReason}
                        </Typography>
                      ) : null}
                    </Box>
                  }
                  slotProps={{
                    typography: {
                      // The whole card is one label, so the radio announces the
                      // full address rather than just a name.
                      'aria-label': describe(
                        address.name,
                        formatAddress(address),
                        address.isDefault ? 'default address' : undefined,
                        address.unavailableReason,
                      ),
                    },
                  }}
                />
              </Paper>
            );
          })}
        </Stack>
      </RadioGroup>

      {onAddNew ? (
        <Button startIcon={<AddIcon />} onClick={onAddNew} sx={{ alignSelf: 'flex-start' }}>
          Add a new address
        </Button>
      ) : null}

      <Box aria-live="polite">
        {result.status === 'error' ? (
          <Typography variant="caption" color="error.main">
            {result.message}
          </Typography>
        ) : null}
      </Box>
    </Stack>
  );
}
