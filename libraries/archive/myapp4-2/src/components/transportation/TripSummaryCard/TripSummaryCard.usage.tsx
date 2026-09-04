/**
 * USAGE — TripSummaryCard
 *
 * Every action (receipt, tip, report, lost item) is wired with the exact
 * trip object it belongs to — nothing reads from a loosely-scoped "last trip".
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { TripSummary } from '../types/domain';
import { TripSummaryCard } from './TripSummaryCard';
import sample from './TripSummaryCard.sample.json';

const { trips } = loadSample<{ trips: TripSummary[] }>(sample);

export const TripSummaryCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {trips.map((trip) => (
        <TripSummaryCard
          key={trip.id}
          trip={trip}
          onViewReceipt={(item) => toast.show(`Opening receipt for trip ${item.id}`)}
          onAddTip={(item) => toast.show(`Opening tip selector for trip ${item.id}`)}
          onReportIssue={(item) => toast.show(`Opening fare dispute for trip ${item.id}`)}
          onFindLostItem={(item) => toast.show(`Opening lost item form for trip ${item.id}`)}
        />
      ))}
    </ScrollView>
  );
};
