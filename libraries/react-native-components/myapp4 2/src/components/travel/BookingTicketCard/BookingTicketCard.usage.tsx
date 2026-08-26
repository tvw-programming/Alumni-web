/**
 * USAGE — BookingTicketCard
 *
 * The expired and canceled tickets both fall back to the barcode-unavailable
 * face — the confirmation code stays legible either way, since it is the
 * ticket's real access path, not the graphic.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { BookingTicket } from '../types/domain';
import { BookingTicketCard } from './BookingTicketCard';
import sample from './BookingTicketCard.sample.json';

const { tickets } = loadSample<{ tickets: BookingTicket[] }>(sample);

export const BookingTicketCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Every state — confirmed, changed, expired, canceled — keeps the confirmation code readable without the QR.
      </Text>
      {tickets.map((ticket) => (
        <BookingTicketCard
          key={ticket.id}
          ticket={ticket}
          onDownload={() => toast.show('Downloading ticket…')}
          onAddToWallet={() => toast.show('Adding to wallet…')}
          onShare={() => toast.show('Opening share sheet')}
          onCopyCode={() => toast.success(`Copied ${ticket.confirmationCode}`)}
        />
      ))}
    </ScrollView>
  );
};
