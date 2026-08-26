import { newRequestId, parseMoney } from '../../../foundation';

import { BookingSummaryCard, type BookingOutcome } from './BookingSummaryCard';
import sample from './sample.json';

export function BookingSummaryCardUsage() {
  return (
    <BookingSummaryCard
      title={sample.title}
      lines={sample.lines}
      total={parseMoney(sample.total)}
      cancellationPolicy={sample.cancellationPolicy}
      // The outcome is the server's. "Unavailable" and "price changed" are
      // ordinary results, not errors.
      onConfirm={async (): Promise<BookingOutcome> => {
        const response = await fetch('/api/bookings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // A retried confirm must not create a second booking.
            'Idempotency-Key': newRequestId(),
          },
        });
        if (!response.ok) throw await response.json();
        const body = (await response.json()) as { outcome: BookingOutcome };
        return body.outcome;
      }}
    />
  );
}
