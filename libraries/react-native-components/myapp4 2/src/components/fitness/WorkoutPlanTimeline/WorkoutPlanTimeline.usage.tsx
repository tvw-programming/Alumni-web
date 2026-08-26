/**
 * USAGE — WorkoutPlanTimeline
 *
 * The collapsed row already summarizes the day's workout(s) — a viewer
 * doesn't have to expand every accordion just to see what's planned this
 * week.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PlanDay } from '../types/domain';
import { WorkoutPlanTimeline } from './WorkoutPlanTimeline';
import sample from './WorkoutPlanTimeline.sample.json';

const { weekLabel, days } = loadSample<{ weekLabel: string; days: PlanDay[] }>(sample);

export const WorkoutPlanTimelineUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [expanded, setExpanded] = useState<string[]>(['2026-08-20']);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <WorkoutPlanTimeline
        weekLabel={weekLabel}
        days={days}
        expandedDayIds={expanded}
        onToggleDay={(dayId) => setExpanded((prev) => (prev.includes(dayId) ? prev.filter((d) => d !== dayId) : [...prev, dayId]))}
        onWorkoutPress={(workoutId) => toast.show(`Opening workout ${workoutId}`)}
        onReschedule={(dayId) => toast.show(`Rescheduling ${dayId}`)}
      />
    </ScrollView>
  );
};
