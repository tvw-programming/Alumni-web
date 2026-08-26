/**
 * USAGE — ActivityRings + StepCounterRing
 *
 * Whose progress this is stays explicit via `ownerLabel` — rings never
 * appear without a clear owner, matching the platform guidance they're
 * modeled after.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ActivityRing } from '../types/domain';
import { ActivityRings } from './ActivityRings';
import { StepCounterRing } from './StepCounterRing';
import sample from './ActivityRings.sample.json';

const data = loadSample<{ rings: ActivityRing[]; ownerLabel: string; dateLabel: string; steps: number; stepsGoal: number }>(sample);

export const ActivityRingsUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <ActivityRings
        rings={data.rings}
        ownerLabel={data.ownerLabel}
        dateLabel={data.dateLabel}
        onPressRing={(ringId) => toast.show(`Opening ${data.rings.find((r) => r.id === ringId)?.label} detail`)}
      />

      <View>
        <Text variant="titleSmall" style={{ marginBottom: theme.spacing.sm }}>
          Step counter (dashboard tile)
        </Text>
        <StepCounterRing steps={data.steps} goal={data.stepsGoal} />
      </View>
    </ScrollView>
  );
};
