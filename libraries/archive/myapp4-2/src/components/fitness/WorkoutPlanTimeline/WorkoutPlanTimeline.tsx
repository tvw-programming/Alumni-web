import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, List, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { PlanDay, PlanDayState, PlanWorkoutStatus } from '../types/domain';

const DAY_STATE_META: Record<PlanDayState, { label?: string; icon: string }> = {
  upcoming: { icon: 'circle-outline' },
  today: { label: 'Today', icon: 'star-four-points' },
  completed: { label: 'Completed', icon: 'check-circle' },
  missed: { label: 'Missed', icon: 'close-circle-outline' },
  rest: { label: 'Rest day', icon: 'weather-night' },
  paused: { label: 'Paused', icon: 'pause-circle-outline' },
};

const WORKOUT_STATUS_ICON: Record<PlanWorkoutStatus, string> = {
  planned: 'circle-outline',
  inProgress: 'play-circle-outline',
  completed: 'check-circle',
  skipped: 'minus-circle-outline',
};

export interface WorkoutPlanTimelineProps extends StyleEscapeHatches {
  weekLabel?: string;
  days: PlanDay[];
  expandedDayIds?: string[];
  onToggleDay: (dayId: string) => void;
  onWorkoutPress: (workoutId: string) => void;
  onReschedule?: (dayId: string) => void;
}

/**
 * The collapsed row is already useful on its own — title, duration, and
 * state are visible before expanding — `List.Accordion` only adds detail,
 * it's never the only way to understand what a day holds.
 */
export const WorkoutPlanTimeline = ({ weekLabel, days, expandedDayIds = [], onToggleDay, onWorkoutPress, onReschedule, style, containerStyle, testID }: WorkoutPlanTimelineProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? 'workout-plan-timeline';

  return (
    <View style={[containerStyle, style]} testID={id}>
      {weekLabel ? (
        <Text variant="titleSmall" style={{ marginBottom: 4 }}>
          {weekLabel}
        </Text>
      ) : null}

      {days.map((day) => {
        const meta = DAY_STATE_META[day.state];
        const isRest = day.state === 'rest';
        const dateLabel = new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
        const summary = isRest ? 'Rest day' : day.workouts.map((w) => `${w.title}${w.durationLabel ? ` (${w.durationLabel})` : ''}`).join(', ') || 'No workouts planned';

        return (
          <List.Accordion
            key={day.date}
            title={day.label}
            description={summary}
            descriptionNumberOfLines={2}
            expanded={expandedDayIds.includes(day.date)}
            onPress={() => onToggleDay(day.date)}
            left={(props) => <List.Icon {...props} icon={meta.icon} color={day.state === 'today' ? theme.colors.primary : day.state === 'missed' ? wellness.colors.warning : wellness.colors.onSurfaceVariant} />}
            titleStyle={day.state === 'today' ? { color: theme.colors.primary, fontWeight: '700' } : undefined}
            testID={childTestID(id, `day-${day.date}`)}
          >
            <View style={{ paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.sm, gap: 6 }}>
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                {dateLabel}
                {meta.label ? ` · ${meta.label}` : ''}
              </Text>

              {isRest ? (
                <Text variant="bodySmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                  No workout scheduled. Recovery days are part of the plan.
                </Text>
              ) : day.workouts.length === 0 ? (
                <Text variant="bodySmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                  No workouts planned for this day.
                </Text>
              ) : (
                day.workouts.map((workout) => (
                  <TouchableRipple
                    key={workout.id}
                    onPress={() => onWorkoutPress(workout.id)}
                    accessibilityRole="button"
                    accessibilityLabel={`${workout.title}, ${workout.type}${workout.durationLabel ? `, ${workout.durationLabel}` : ''}, ${workout.status}`}
                    testID={childTestID(id, `workout-${workout.id}`)}
                  >
                    <View style={styles.workoutRow}>
                      <Icon source={WORKOUT_STATUS_ICON[workout.status]} size={16} color={workout.status === 'completed' ? wellness.colors.success : wellness.colors.onSurfaceVariant} />
                      <View style={[styles.flex, { marginLeft: 8 }]}>
                        <Text variant="bodyMedium">{workout.title}</Text>
                        <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
                          {workout.type}
                          {workout.durationLabel ? ` · ${workout.durationLabel}` : ''}
                        </Text>
                      </View>
                    </View>
                  </TouchableRipple>
                ))
              )}

              {(day.state === 'upcoming' || day.state === 'today') && onReschedule && !isRest ? (
                <TouchableRipple onPress={() => onReschedule(day.date)} accessibilityRole="button" accessibilityLabel={`Reschedule ${day.label}`} testID={childTestID(id, `reschedule-${day.date}`)}>
                  <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                    Reschedule
                  </Text>
                </TouchableRipple>
              ) : null}
            </View>
          </List.Accordion>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  workoutRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  flex: { flex: 1 },
});
