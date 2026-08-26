import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  ActivityRingsUsage,
  ExerciseListItemUsage,
  HabitCheckRowUsage,
  MealCardUsage,
  MeditationPlayerCardUsage,
  PersonalRecordAndStreakUsage,
  RestTimerCircleUsage,
  SleepSummaryCardUsage,
  WaterIntakeTrackerUsage,
  WeightLogChartUsage,
  WorkoutCardUsage,
  WorkoutPlanTimelineUsage,
} from '@ui/fitness';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'workout', title: 'WorkoutCard', description: 'Calorie estimates always labelled as estimates, never guarantees', Component: WorkoutCardUsage },
  { key: 'exercise', title: 'ExerciseListItem', description: 'Prescription always renders as text next to the thumbnail', Component: ExerciseListItemUsage },
  { key: 'rest-timer', title: 'RestTimerCircle', description: 'Numeric countdown stays primary; urgency shown late, calmly', Component: RestTimerCircleUsage },
  { key: 'rings', title: 'ActivityRings + StepCounterRing', description: 'Whose rings these are is always stated; text equivalents ship with every ring', Component: ActivityRingsUsage },
  { key: 'water', title: 'WaterIntakeTracker', description: 'Tap-to-fill glasses pair icon shape with number, never colour alone', Component: WaterIntakeTrackerUsage },
  { key: 'meal', title: 'MealCard + MacroBreakdownBar', description: 'Over-goal macros are labelled as text, never just an overflowing bar', Component: MealCardUsage },
  { key: 'weight', title: 'WeightLogChart + LogEntrySheet', description: 'Neutral trend language; every point also listed as an exact value', Component: WeightLogChartUsage },
  { key: 'habit', title: 'HabitCheckRow', description: 'A missed day is a fact, never shame-based copy', Component: HabitCheckRowUsage },
  { key: 'sleep', title: 'SleepSummaryCard', description: 'A calm palette; the score is never presented as a diagnosis', Component: SleepSummaryCardUsage },
  { key: 'plan', title: 'WorkoutPlanTimeline', description: 'The collapsed row is useful before any accordion opens', Component: WorkoutPlanTimelineUsage },
  { key: 'records', title: 'PersonalRecordCard + StreakFlame', description: 'A broken streak keeps its longest-streak history visible', Component: PersonalRecordAndStreakUsage },
  { key: 'meditation', title: 'MeditationPlayerCard', description: 'Session types never assume identical timer or autoplay behaviour', Component: MeditationPlayerCardUsage },
];

export const FitnessScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((item) => item.key === active), [active]);

  if (entry) {
    const { Component } = entry;
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { padding: theme.spacing.md, backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.flex}>
            {entry.title}
          </Text>
          <Text
            variant="labelLarge"
            onPress={() => setActive(null)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Back
          </Text>
        </View>
        <Component />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <StateView
        preset="success"
        compact
        title="Fitness & wellness library"
        description="12 components, each with a sample JSON payload and a compiling usage example."
      />

      <AppCard variant="outlined" padded={false}>
        {ENTRIES.map((item, index) => (
          <List.Item
            key={item.key}
            title={item.title}
            description={item.description}
            descriptionNumberOfLines={2}
            onPress={() => setActive(item.key)}
            left={() => (
              <View style={[styles.index, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            )}
            right={() => <List.Icon icon="chevron-right" />}
            testID={`fitness-entry-${item.key}`}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
