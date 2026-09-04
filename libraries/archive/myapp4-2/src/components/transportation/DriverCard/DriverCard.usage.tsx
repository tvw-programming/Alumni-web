/**
 * USAGE — DriverCard
 *
 * Sunita's card shows a "pending" verification (no info affordance) and a
 * blocked contact state — both render as visible facts, not hidden gaps.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';
import { Text } from 'react-native-paper';

import { loadSample } from '../types/sample';
import type { Driver } from '../types/domain';
import { DriverCard } from './DriverCard';
import sample from './DriverCard.sample.json';

const { drivers } = loadSample<{ drivers: Driver[] }>(sample);

export const DriverCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {drivers.map((driver) => (
        <DriverCard
          key={driver.id}
          driver={driver}
          showSafetyAction
          onCall={() => toast.show('Calling via masked number…')}
          onChat={() => toast.show('Opening chat')}
          onShare={() => toast.show('Sharing trip with your contacts')}
          onSafety={() => toast.show('Opening Safety Centre')}
          onExplainVerification={() => sheet.open(<Text variant="bodyMedium">ID and background verified by our partner team.</Text>, { title: 'What verification means', variant: 'bottom' })}
        />
      ))}
    </ScrollView>
  );
};
