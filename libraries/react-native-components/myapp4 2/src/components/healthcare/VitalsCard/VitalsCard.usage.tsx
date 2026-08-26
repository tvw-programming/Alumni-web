/**
 * USAGE — VitalsCard
 *
 * The same numeric value renders differently depending on where it came from —
 * patient-entered, device-synced and clinician-reviewed are visually distinct,
 * which is the whole point of the provenance model.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { VitalReading } from '../types/domain';
import { VitalsCard } from './VitalsCard';
import sample from './VitalsCard.sample.json';

const { readings } = loadSample<{ readings: VitalReading[] }>(sample);

export const VitalsCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Note the blood pressure card: it is above the usual range but is presented calmly, because "outside your usual
        range" is an observation, not an emergency.
      </Text>

      <Text variant="labelLarge">Single vital — outside usual range</Text>
      <VitalsCard
        reading={readings[0]}
        onViewTrend={() => toast.show('Opening the 90-day trend')}
        onContactCareTeam={() => toast.show('Opening a message to your care team')}
        testID="vitals-bp"
      />

      <Text variant="labelLarge">Clinician-reviewed, flagged for a conversation</Text>
      <VitalsCard
        reading={readings[3]}
        onViewTrend={() => toast.show('Opening trend')}
        onContactCareTeam={() => toast.success('Starting a message to Dr. Nair')}
        testID="vitals-spo2"
      />

      <Text variant="labelLarge">Stale reading — patient entered a week ago</Text>
      <VitalsCard reading={readings[4]} onViewTrend={() => toast.show('Trend')} testID="vitals-temp" />

      <Text variant="labelLarge">Unknown source</Text>
      <VitalsCard reading={readings[5]} testID="vitals-weight" />

      <Text variant="labelLarge">Multi-vital dashboard</Text>
      <VitalsCard
        readings={readings.slice(0, 4)}
        compact
        onViewTrend={(reading) => toast.show(`Trend for ${reading.type}`)}
        onContactCareTeam={() => toast.show('Message care team')}
        testID="vitals-dashboard"
      />

      <Text variant="labelLarge">No readings</Text>
      <VitalsCard readings={[]} onAddReading={() => toast.show('Opening manual entry')} testID="vitals-empty" />

      <Text variant="labelLarge">Loading</Text>
      <VitalsCard loading testID="vitals-loading" />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
