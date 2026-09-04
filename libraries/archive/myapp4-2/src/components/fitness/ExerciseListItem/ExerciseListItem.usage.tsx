/**
 * USAGE — ExerciseListItem
 *
 * The prescription always renders as text next to the thumbnail — "3 sets
 * × 10 reps, 40 kg" — never relying on the animated media alone.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ExerciseItem } from '../types/domain';
import { ExerciseListItem } from './ExerciseListItem';
import sample from './ExerciseListItem.sample.json';

const { exercises: initial } = loadSample<{ exercises: ExerciseItem[] }>(sample);

export const ExerciseListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [exercises, setExercises] = useState(initial);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {exercises.map((exercise, index) => (
        <React.Fragment key={exercise.id}>
          <ExerciseListItem
            exercise={exercise}
            onPress={(item) => toast.show(`Opening ${item.name}`)}
            onComplete={(item) =>
              setExercises((prev) => prev.map((e) => (e.id === item.id ? { ...e, status: e.status === 'completed' ? 'upcoming' : 'completed' } : e)))
            }
            onEdit={(item) => toast.show(`Viewing instructions for ${item.name}`)}
            onReplace={(item) => toast.show(`Opening replacements for ${item.name}`)}
          />
          {index < exercises.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
