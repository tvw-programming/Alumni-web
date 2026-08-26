import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import CardMedia from '@mui/material/CardMedia';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import {
  describe,
  formatMoney,
  statusOf,
  useAction,
  useOptimisticValue,
  type Money,
  type ProductId,
  type StatusMap,
} from '../../../foundation';

export type ProductAvailability = 'available' | 'lowStock' | 'outOfStock' | 'unknown';

export interface ProductSummary {
  id: ProductId;
  title: string;
  imageUri: string;
  brand?: string;
  price?: Money;
  compareAtPrice?: Money;
  rating?: number;
  reviewCount?: number;
  availability: ProductAvailability;
  badges?: string[];
}

export interface ProductCardProps {
  product: ProductSummary;
  variant?: 'grid' | 'list' | 'compact';
  saved?: boolean;
  onPress: () => void;
  onToggleSaved?: (next: boolean) => Promise<void>;
  onAddToCart?: () => Promise<void>;
}

/**
 * Availability as words first, colour second.
 *
 * "Out of stock" in grey and "In stock" in green are the same chip to a
 * colour-blind user, so the label carries the meaning and the colour only
 * reinforces it.
 */
const AVAILABILITY: StatusMap<ProductAvailability> = {
  available: { label: 'In stock', color: 'success' },
  lowStock: { label: 'Only a few left', color: 'warning' },
  outOfStock: { label: 'Out of stock', color: 'default' },
  unknown: { label: 'Availability unknown', color: 'default' },
};

/**
 * A product tile for a catalogue, in three densities.
 *
 * Two React 19 patterns, chosen by what the server is allowed to reject:
 *
 * - **Wishlist** uses `useOptimistic`. Saving is the user's own preference, it
 *   cannot fail for a business reason, and React returns the heart to the
 *   authoritative value by itself if the request does fail.
 * - **Add to cart** uses `useActionState` (through `useAction`). The server can
 *   refuse it — price moved, stock ran out, the variant is gone — so the button
 *   never claims success from the tap alone.
 *
 * Memoised by props: a catalogue renders hundreds of these, and a parent state
 * change must not re-render every tile.
 */
export const ProductCard = memo(function ProductCard({
  product,
  variant = 'grid',
  saved = false,
  onPress,
  onToggleSaved,
  onAddToCart,
}: ProductCardProps) {
  const [optimisticSaved, toggleSaved, savePending] = useOptimisticValue(saved, async (next) => {
    await onToggleSaved?.(next);
  });

  const [cartResult, addToCart, cartPending] = useAction<void, 'added'>(async () => {
    await onAddToCart?.();
    return 'added';
  });

  const availability = statusOf(AVAILABILITY, product.availability);
  const soldOut = product.availability === 'outOfStock';
  const isList = variant === 'list';
  const isCompact = variant === 'compact';

  const discounted =
    product.price !== undefined &&
    product.compareAtPrice !== undefined &&
    product.compareAtPrice.amountMinor > product.price.amountMinor;

  // One sentence for the whole tile. Assembling it here means a screen-reader
  // user hears "title, brand, price, rating, availability" as a unit instead of
  // tabbing through four fragments and reconstructing it.
  const productLabel = describe(
    product.title,
    product.brand,
    product.price && formatMoney(product.price),
    discounted && product.compareAtPrice && `reduced from ${formatMoney(product.compareAtPrice)}`,
    product.rating !== undefined && `rated ${product.rating} out of 5`,
    product.reviewCount !== undefined && `${product.reviewCount} reviews`,
    availability.label,
  );

  return (
    <Card
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: isList ? 'row' : 'column',
        height: isList ? 'auto' : '100%',
        opacity: soldOut ? 0.75 : 1,
      }}
    >
      {/* The navigation target is its own control, so the wishlist and cart
          buttons below are not swallowed by it. */}
      <CardActionArea
        onClick={onPress}
        aria-label={productLabel}
        sx={{
          display: 'flex',
          flexDirection: isList ? 'row' : 'column',
          alignItems: 'stretch',
          flexGrow: 1,
        }}
      >
        <Box sx={{ position: 'relative', flexShrink: 0, width: isList ? 120 : '100%' }}>
          <CardMedia
            component="img"
            image={product.imageUri}
            // Empty alt, not the title: the accessible name is already on the
            // action area, and repeating it makes the screen reader say it twice.
            alt=""
            sx={{
              // A fixed ratio is what stops the grid reflowing as images arrive.
              aspectRatio: isList ? '1 / 1' : '4 / 5',
              objectFit: 'cover',
              bgcolor: 'action.hover',
            }}
          />
          {product.badges?.length ? (
            <Stack direction="row" spacing={0.5} sx={{ position: 'absolute', top: 8, left: 8 }}>
              {product.badges.map((badge) => (
                <Chip key={badge} size="small" label={badge} color="primary" />
              ))}
            </Stack>
          ) : null}
        </Box>

        <CardContent sx={{ flexGrow: 1, minWidth: 0, py: isCompact ? 1 : 2 }}>
          {product.brand ? (
            <Typography variant="caption" color="text.secondary" noWrap>
              {product.brand}
            </Typography>
          ) : null}

          <Typography
            variant={isCompact ? 'body2' : 'subtitle2'}
            sx={{
              fontWeight: 600,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {product.title}
          </Typography>

          {product.price ? (
            <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mt: 0.5 }}>
              <Typography variant="subtitle1" fontWeight={700}>
                {formatMoney(product.price)}
              </Typography>
              {discounted && product.compareAtPrice ? (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textDecoration: 'line-through' }}
                >
                  {formatMoney(product.compareAtPrice)}
                </Typography>
              ) : null}
            </Stack>
          ) : null}

          {product.rating !== undefined && !isCompact ? (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
              <StarIcon fontSize="inherit" sx={{ color: 'warning.main' }} />
              <Typography variant="caption">
                {product.rating.toFixed(1)}
                {product.reviewCount !== undefined ? ` (${String(product.reviewCount)})` : ''}
              </Typography>
            </Stack>
          ) : null}

          <Chip
            size="small"
            label={availability.label}
            color={availability.color}
            variant={product.availability === 'available' ? 'outlined' : 'filled'}
            sx={{ mt: 1 }}
          />
        </CardContent>
      </CardActionArea>

      <Stack
        direction="row"
        spacing={1}
        alignItems="center"
        sx={{ px: 2, pb: 2, pt: isList ? 2 : 0 }}
      >
        {onAddToCart ? (
          <Button
            size="small"
            variant="contained"
            disabled={soldOut || cartPending}
            onClick={() => {
              addToCart();
            }}
            sx={{ flexGrow: 1 }}
          >
            {cartPending ? 'Adding…' : soldOut ? 'Out of stock' : 'Add to cart'}
          </Button>
        ) : null}

        {onToggleSaved ? (
          <Tooltip title={optimisticSaved ? 'Remove from wishlist' : 'Save for later'}>
            <IconButton
              size="small"
              aria-label={optimisticSaved ? 'Remove from wishlist' : 'Save for later'}
              aria-pressed={optimisticSaved}
              disabled={savePending}
              onClick={() => {
                toggleSaved(!optimisticSaved);
              }}
            >
              {optimisticSaved ? <FavoriteIcon color="error" /> : <FavoriteBorderIcon />}
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>

      {/* The result of the Action, announced rather than only drawn. */}
      <Box aria-live="polite" sx={{ px: 2, pb: cartResult.status === 'idle' ? 0 : 1.5 }}>
        {cartResult.status === 'success' ? (
          <Typography variant="caption" color="success.main">
            Added to cart
          </Typography>
        ) : null}
        {cartResult.status === 'error' ? (
          <Typography variant="caption" color="error.main">
            {cartResult.message}
          </Typography>
        ) : null}
      </Box>
    </Card>
  );
});
