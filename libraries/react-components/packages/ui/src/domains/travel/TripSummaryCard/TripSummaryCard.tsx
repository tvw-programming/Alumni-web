import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Rating from '@mui/material/Rating';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { useState } from 'react';

import {
  clockLabel,
  formatMoney,
  useAction,
  useOptimisticValue,
  type Money,
} from '../../../foundation';

import { PriceBreakdown, type PriceLine } from '../../ecommerce/PriceBreakdown/PriceBreakdown';

export interface TripSummary {
  id: string;
  from: string;
  to: string;
  startedAt: string;
  endedAt: string;
  distanceKm: number;
  durationMinutes: number;
  fareLines: PriceLine[];
  total: Money;
  driverName: string;
  ratingGiven?: number;
  tipGiven?: Money;
}

export interface TripSummaryCardProps {
  trip: TripSummary;
  tipOptions: Money[];
  onRate: (rating: number) => Promise<void>;
  onTip: (amount: Money) => Promise<void>;
}

/**
 * The completed trip: fare, rating and tip.
 *
 * The fare uses `PriceBreakdown`, so a surge or a toll appears as a line rather
 * than as an unexplained difference from the quote. A rider who cannot see why
 * a trip cost more is a rider who disputes it.
 *
 * Rating and tip are optimistic — they are the rider's own gestures, reversible,
 * and worth showing instantly. The **fare is not**: it is settled money.
 */
export function TripSummaryCard({ trip, tipOptions, onRate, onTip }: TripSummaryCardProps) {
  const [rating, setRating, ratingPending] = useOptimisticValue(
    trip.ratingGiven ?? 0,
    async (next) => {
      await onRate(next);
    },
  );
  const [selectedTip, setSelectedTip] = useState<Money | undefined>(trip.tipGiven);

  const [tipResult, tip, tipPending] = useAction<Money, Money>(async (_previous, amount) => {
    await onTip(amount);
    setSelectedTip(amount);
    return amount;
  });

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700}>
          {`${trip.from} → ${trip.to}`}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {`${clockLabel(trip.startedAt)} – ${clockLabel(trip.endedAt)} · ${trip.distanceKm.toFixed(1)} km · ${String(trip.durationMinutes)} min`}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        <PriceBreakdown lines={trip.fareLines} total={trip.total} totalLabel="Fare" dense />

        <Divider sx={{ my: 1.5 }} />

        <Stack spacing={1}>
          <Typography variant="body2">{`How was your trip with ${trip.driverName}?`}</Typography>
          <Rating
            value={rating}
            disabled={ratingPending}
            onChange={(_event, next) => {
              if (next !== null) setRating(next);
            }}
          />

          <Typography variant="body2" sx={{ mt: 1 }}>
            Add a tip
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {tipOptions.map((option) => (
              <Button
                key={option.amountMinor.toString()}
                size="small"
                variant={selectedTip?.amountMinor === option.amountMinor ? 'contained' : 'outlined'}
                disabled={tipPending}
                onClick={() => {
                  tip(option);
                }}
              >
                {formatMoney(option)}
              </Button>
            ))}
          </Stack>

          {tipResult.status === 'success' ? (
            <Typography variant="caption" color="success.main" role="status">
              {`${formatMoney(tipResult.data)} tip added. Thank you.`}
            </Typography>
          ) : null}
          {tipResult.status === 'error' ? (
            <Typography variant="caption" color="error.main" role="alert">
              {tipResult.message}
            </Typography>
          ) : null}
        </Stack>
      </CardContent>
    </Card>
  );
}
