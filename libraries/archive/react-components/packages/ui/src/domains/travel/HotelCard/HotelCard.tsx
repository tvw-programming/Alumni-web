import PlaceIcon from '@mui/icons-material/Place';
import StarIcon from '@mui/icons-material/Star';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, formatMoney, type Money } from '../../../foundation';

export interface Hotel {
  id: string;
  name: string;
  imageUri: string;
  areaLabel: string;
  distanceLabel?: string;
  starRating?: number;
  reviewScore?: number;
  reviewCount?: number;
  /** Per night, before taxes. */
  nightlyPrice: Money;
  /** For the whole stay, taxes included. Both are shown. */
  totalPrice: Money;
  nights: number;
  freeCancellationUntil?: string;
  roomsLeft?: number;
}

export interface HotelCardProps {
  hotel: Hotel;
  onSelect: () => void;
}

/**
 * A hotel search result.
 *
 * **Both prices, always.** Per-night is what people compare on and total is
 * what they pay; showing only the first is how a ₹4,000 room becomes ₹19,000 at
 * checkout. The total says "for 4 nights, taxes included" so there is no second
 * reading of it.
 *
 * The cancellation deadline is a date, not the phrase "free cancellation" — the
 * phrase without a date is worthless at the moment it matters.
 */
export const HotelCard = memo(function HotelCard({ hotel, onSelect }: HotelCardProps) {
  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
      <Box
        component="img"
        src={hotel.imageUri}
        alt=""
        sx={{
          width: { xs: '100%', sm: 200 },
          aspectRatio: { xs: '16 / 9', sm: '4 / 3' },
          objectFit: 'cover',
          bgcolor: 'action.hover',
        }}
      />

      <CardContent sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              fontWeight={700}
              aria-label={describe(
                hotel.name,
                hotel.starRating ? `${String(hotel.starRating)} star` : undefined,
                hotel.areaLabel,
                hotel.distanceLabel,
                hotel.reviewScore
                  ? `rated ${String(hotel.reviewScore)} out of 10 from ${String(hotel.reviewCount)} reviews`
                  : undefined,
                `${formatMoney(hotel.nightlyPrice)} per night`,
                `${formatMoney(hotel.totalPrice)} total for ${String(hotel.nights)} nights including taxes`,
                hotel.freeCancellationUntil
                  ? `free cancellation until ${hotel.freeCancellationUntil}`
                  : 'non-refundable',
              )}
            >
              {hotel.name}
            </Typography>

            <Stack direction="row" spacing={0.5} alignItems="center" aria-hidden>
              {hotel.starRating ? (
                <>
                  <StarIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption">{hotel.starRating}</Typography>
                </>
              ) : null}
              <PlaceIcon sx={{ fontSize: 14, ml: 0.5 }} color="disabled" />
              <Typography variant="caption" color="text.secondary" noWrap>
                {[hotel.areaLabel, hotel.distanceLabel].filter(Boolean).join(' · ')}
              </Typography>
            </Stack>

            {hotel.reviewScore !== undefined ? (
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }} aria-hidden>
                <Chip size="small" color="primary" label={hotel.reviewScore.toFixed(1)} />
                <Typography variant="caption" color="text.secondary">
                  {hotel.reviewCount ? `${String(hotel.reviewCount)} reviews` : ''}
                </Typography>
              </Stack>
            ) : null}

            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 1 }}
              flexWrap="wrap"
              useFlexGap
              aria-hidden
            >
              {/* A date, not the bare phrase. */}
              <Chip
                size="small"
                variant="outlined"
                color={hotel.freeCancellationUntil ? 'success' : 'default'}
                label={
                  hotel.freeCancellationUntil
                    ? `Free cancellation until ${hotel.freeCancellationUntil}`
                    : 'Non-refundable'
                }
              />
              {hotel.roomsLeft !== undefined && hotel.roomsLeft <= 3 ? (
                <Chip
                  size="small"
                  color="warning"
                  variant="outlined"
                  label={`${String(hotel.roomsLeft)} rooms left`}
                />
              ) : null}
            </Stack>
          </Stack>

          <Stack alignItems="flex-end" spacing={0.5} sx={{ minWidth: 150 }} aria-hidden>
            <Typography variant="h6" fontWeight={700}>
              {formatMoney(hotel.nightlyPrice)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              per night
            </Typography>
            {/* Both prices, always. */}
            <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'right' }}>
              {`${formatMoney(hotel.totalPrice)} total for ${String(hotel.nights)} nights, taxes included`}
            </Typography>
            <Button variant="contained" size="small" onClick={onSelect} sx={{ mt: 0.5 }}>
              See rooms
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
});
