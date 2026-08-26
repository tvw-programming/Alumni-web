import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RemoveIcon from '@mui/icons-material/Remove';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import {
  describe,
  formatMoney,
  multiplyMoney,
  useOptimisticValue,
  type CartItemId,
  type Money,
} from '../../../foundation';

export interface CartItem {
  id: CartItemId;
  title: string;
  imageUri?: string;
  variantLabel?: string;
  unitPrice: Money;
  maxQuantity?: number;
}

export interface CartLineItemProps {
  item: CartItem;
  quantity: number;
  updateState?: 'idle' | 'updating' | 'error';
  errorMessage?: string;
  onQuantityChange: (quantity: number) => Promise<void>;
  onRemove: () => Promise<void>;
}

/**
 * One cart line, with an optimistic quantity.
 *
 * Quantity is the textbook `useOptimistic` case: the user chose the number, the
 * change is reversible, and a stepper that waits for a round trip feels broken.
 * React shows the predicted quantity during the transition and falls back to
 * the authoritative prop when the Action settles — so a server that clamps the
 * value to available stock wins without any rollback code here.
 *
 * The **line total is derived from the optimistic quantity** so the row stays
 * internally consistent while pending, but the **cart total is not** — that
 * belongs to `CartSummary`, which shows only server-computed money.
 *
 * Memoised by line id: changing one quantity must not re-render every row.
 */
export const CartLineItem = memo(function CartLineItem({
  item,
  quantity,
  updateState = 'idle',
  errorMessage,
  onQuantityChange,
  onRemove,
}: CartLineItemProps) {
  const [optimisticQuantity, setQuantity, pending] = useOptimisticValue(quantity, async (next) => {
    if (next <= 0) {
      await onRemove();
      return;
    }
    await onQuantityChange(next);
  });

  const busy = pending || updateState === 'updating';
  const atMax = item.maxQuantity !== undefined && optimisticQuantity >= item.maxQuantity;
  const lineTotal = multiplyMoney(item.unitPrice, optimisticQuantity);

  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      sx={{ py: 1.5, opacity: busy ? 0.7 : 1, transition: 'opacity 120ms' }}
      // One phrase for the row, so the line is not read as four fragments.
      aria-label={describe(
        item.title,
        item.variantLabel,
        `quantity ${String(optimisticQuantity)}`,
        formatMoney(lineTotal),
        busy ? 'updating' : undefined,
      )}
    >
      <Avatar
        variant="rounded"
        src={item.imageUri}
        alt=""
        sx={{ width: 56, height: 56, bgcolor: 'action.hover' }}
      />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {item.title}
        </Typography>
        {item.variantLabel ? (
          <Typography variant="caption" color="text.secondary">
            {item.variantLabel}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary" display="block">
          {formatMoney(item.unitPrice)} each
        </Typography>
      </Box>

      <Stack direction="row" alignItems="center" spacing={0.5}>
        <IconButton
          size="small"
          aria-label={optimisticQuantity === 1 ? `Remove ${item.title}` : 'Decrease quantity'}
          disabled={busy}
          onClick={() => {
            setQuantity(optimisticQuantity - 1);
          }}
        >
          {optimisticQuantity === 1 ? (
            <DeleteOutlineIcon fontSize="small" />
          ) : (
            <RemoveIcon fontSize="small" />
          )}
        </IconButton>

        {/* A live region, so a screen reader hears the new quantity without
            the user having to go looking for it. */}
        <Typography
          variant="body2"
          aria-live="polite"
          sx={{ minWidth: 28, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
        >
          {optimisticQuantity}
        </Typography>

        <IconButton
          size="small"
          aria-label="Increase quantity"
          disabled={busy || atMax}
          onClick={() => {
            setQuantity(optimisticQuantity + 1);
          }}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Box sx={{ width: 96, textAlign: 'right' }}>
        {busy ? (
          <CircularProgress size={16} />
        ) : (
          <Typography variant="body2" fontWeight={700}>
            {formatMoney(lineTotal)}
          </Typography>
        )}
      </Box>

      <IconButton
        size="small"
        aria-label={`Remove ${item.title} from cart`}
        disabled={busy}
        onClick={() => {
          setQuantity(0);
        }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>

      {updateState === 'error' && errorMessage ? (
        <Typography variant="caption" color="error.main" role="alert" sx={{ width: '100%' }}>
          {errorMessage}
        </Typography>
      ) : null}
    </Stack>
  );
});
