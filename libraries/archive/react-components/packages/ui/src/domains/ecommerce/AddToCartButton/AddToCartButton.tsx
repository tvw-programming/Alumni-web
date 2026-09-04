import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import CheckIcon from '@mui/icons-material/Check';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import { useAction } from '../../../foundation';

export interface AddToCartButtonProps {
  /** Disabled and relabelled when the variant cannot be bought. */
  disabled?: boolean;
  quantity?: number;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
  /** Rejects to report a refusal — price change, stock, variant gone. */
  onAddToCart: (quantity: number) => Promise<void>;
}

/**
 * The single place "add to cart" is expressed, so no screen invents its own.
 *
 * The whole point is that the button reports the *server's* answer. A cart
 * button that turns green on click is lying whenever stock ran out between the
 * page render and the tap — which, on a busy product, is often.
 *
 * `useActionState` gives the pending flag and keeps the failure as state rather
 * than an exception, so a rejected add shows a message instead of unmounting
 * the product page through an error boundary.
 */
export function AddToCartButton({
  disabled = false,
  quantity = 1,
  label = 'Add to cart',
  fullWidth = false,
  size = 'medium',
  onAddToCart,
}: AddToCartButtonProps) {
  const [result, add, pending] = useAction<number, 'added'>(async (_previous, next) => {
    await onAddToCart(next);
    return 'added';
  });

  const succeeded = result.status === 'success';

  return (
    <Box sx={{ width: fullWidth ? '100%' : 'auto' }}>
      <Button
        variant="contained"
        size={size}
        fullWidth={fullWidth}
        disabled={disabled || pending}
        startIcon={
          pending ? (
            <CircularProgress size={16} color="inherit" />
          ) : succeeded ? (
            <CheckIcon />
          ) : (
            <AddShoppingCartIcon />
          )
        }
        onClick={() => {
          add(quantity);
        }}
      >
        {pending ? 'Adding…' : succeeded ? 'Added' : disabled ? 'Unavailable' : label}
      </Button>

      {/* Polite, not assertive: an addition is a confirmation, not an
          interruption the user has to act on. */}
      <Box aria-live="polite" sx={{ minHeight: result.status === 'idle' ? 0 : 20, mt: 0.5 }}>
        {succeeded ? (
          <Typography variant="caption" color="success.main">
            Added to cart
          </Typography>
        ) : null}
        {result.status === 'error' || result.status === 'conflict' ? (
          <Typography variant="caption" color="error.main">
            {result.message}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
