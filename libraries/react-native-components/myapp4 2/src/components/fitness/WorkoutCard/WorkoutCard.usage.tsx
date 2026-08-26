/**
 * USAGE — WorkoutCard
 *
 * "Elite Power Circuit" stays visible and browsable while locked — the card
 * disables the start action rather than hiding a workout the catalog knows
 * about.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { WorkoutCardData } from '../types/domain';
import { WorkoutCard } from './WorkoutCard';
import sample from './WorkoutCard.sample.json';

const { workouts } = loadSample<{ workouts: WorkoutCardData[] }>(sample);

export const WorkoutCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {workouts.map((workout) => (
          <View key={workout.id} style={{ width: '47%' }}>
            <WorkoutCard
              workout={workout}
              onPress={(item) => toast.show(`Opening ${item.title}`)}
              onPrimaryAction={(item) => toast.show(`${item.state === 'inProgress' ? 'Resuming' : 'Starting'} ${item.title}`)}
              onSchedule={(item) => toast.success(`${item.title} added to plan`)}
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
