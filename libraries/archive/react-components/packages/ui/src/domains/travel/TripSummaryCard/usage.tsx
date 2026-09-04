import { parseMoney } from '../../../foundation';

import sample from './sample.json';
import { TripSummaryCard, type TripSummary } from './TripSummaryCard';

import type { PriceLine } from '../../ecommerce/PriceBreakdown/PriceBreakdown';

export function TripSummaryCardUsage() {
  const fareLines: PriceLine[] = sample.trip.fareLines.map((line) => ({
    label: line.label,
    amount: parseMoney(line.amount),
    note: line.note,
  }));

  const trip: TripSummary = {
    ...(sample.trip as unknown as TripSummary),
    fareLines,
    total: parseMoney(sample.trip.total),
  };

  return (
    <TripSummaryCard
      trip={trip}
      tipOptions={sample.tipOptions.map(parseMoney)}
      onRate={async (rating) => {
        await fetch(`/api/trips/${trip.id}/rating`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rating }),
        });
      }}
      onTip={async (amount) => {
        const response = await fetch(`/api/trips/${trip.id}/tip`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amountMinor: amount.amountMinor.toString(),
            currency: amount.currency,
          }),
        });
        if (!response.ok) throw await response.json();
      }}
    />
  );
}
