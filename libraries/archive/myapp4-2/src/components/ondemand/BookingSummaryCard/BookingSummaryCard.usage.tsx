/**
 * USAGE — BookingSummaryCard
 *
 * The "changed" booking keeps its old total struck nowhere — instead the note
 * sits right beside the new total so the delta is legible without arithmetic.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { BookingSummary } from '../types/domain';
import { BookingSummaryCard } from './BookingSummaryCard';
import sample from './BookingSummaryCard.sample.json';

const { bookings } = loadSample<{ bookings: BookingSummary[] }>(sample);

export const BookingSummaryCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const handleConfirm = (booking: BookingSummary) => {
    setConfirmingId(booking.service.id);
    setTimeout(() => {
      setConfirmingId(null);
      toast.success('Booking confirmed');
    }, 900);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      {bookings.map((booking) => (
        <BookingSummaryCard
          key={booking.service.id}
          summary={booking}
          confirming={confirmingId === booking.service.id}
          onChangeSlot={() => toast.show('Opening time picker')}
          onChangeLocation={() => toast.show('Opening address picker')}
          onChangeProvider={() => toast.show('Opening provider list')}
          onChangeAddOns={() => toast.show('Opening add-ons')}
          onExplainPrice={() => toast.show('Fees cover platform support and payment processing')}
          onConfirm={() => handleConfirm(booking)}
          onRetry={() => toast.show('Retrying booking…')}
        />
      ))}

      <Text variant="labelLarge">Loading</Text>
      <BookingSummaryCard summary={bookings[0]!} loading testID="booking-summary-loading" />
    </ScrollView>
  );
};
