/**
 * USAGE — FlightResultCard
 *
 * The self-transfer connection is flagged right on the card — nothing about
 * "you must recheck your bags" waits for a detail screen.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { FlightOffer } from '../types/domain';
import { FlightResultCard } from './FlightResultCard';
import sample from './FlightResultCard.sample.json';

const { offers } = loadSample<{ offers: FlightOffer[] }>(sample);

export const FlightResultCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        The self-transfer connection (fl-3) and the sold-out offer (fl-5) show why status has to be a first-class
        render, not an afterthought on the price.
      </Text>
      {offers.map((offer) => (
        <FlightResultCard
          key={offer.id}
          offer={offer}
          travelerCount={2}
          variant="expanded"
          onSelect={(item) => toast.success(`Selected ${item.id}`)}
          onViewDetails={(item) => toast.show(`Opening details for ${item.id}`)}
        />
      ))}

      <Text variant="labelLarge">Loading</Text>
      <FlightResultCard offer={offers[0]!} loading testID="flight-loading" />
    </ScrollView>
  );
};
