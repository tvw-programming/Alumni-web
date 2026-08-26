/**
 * USAGE — ProgressRing + CourseProgressBar
 *
 * The case worth checking is "almostComplete": the value is 99 and the status is
 * still `inProgress`, so the bar refuses to render as finished. A learner should
 * never see a full bar while a project is awaiting review.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ProgressValue } from '../types/domain';
import { CourseProgressBar, type Milestone } from './CourseProgressBar';
import { ProgressRing } from './ProgressRing';
import sample from './Progress.sample.json';

const data = loadSample<{ values: Record<string, ProgressValue>; milestones: Milestone[] }>(sample);

export const ProgressUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelLarge">Rings</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md, alignItems: 'center' }}>
        <ProgressRing progress={data.values.course!} testID="ring-course" />
        <ProgressRing progress={data.values.complete!} testID="ring-complete" />
        <ProgressRing progress={data.values.notStarted!} testID="ring-empty" />
        <ProgressRing progress={data.values.dailyGoal!} size={64} strokeWidth={6} compact testID="ring-daily" />
      </View>

      <Divider />

      <Text variant="labelLarge">Bars</Text>
      <AppCard variant="outlined">
        <View style={{ gap: theme.spacing.lg }}>
          <CourseProgressBar
            progress={data.values.course!}
            milestones={data.milestones}
            nextAction={{ label: 'Continue lesson 6', onPress: () => toast.show('Opening lesson 6') }}
            onExplainRule={() =>
              sheet.open(
                <Text variant="bodyMedium">{data.values.course!.completionRule}</Text>,
                { title: 'What counts toward progress?', variant: 'bottom' },
              )
            }
            testID="bar-course"
          />

          <CourseProgressBar progress={data.values.module!} testID="bar-module" />

          <CourseProgressBar progress={data.values.almostComplete!} testID="bar-almost" />

          <CourseProgressBar progress={data.values.complete!} testID="bar-complete" />

          <CourseProgressBar progress={data.values.notStarted!} testID="bar-none" />

          <CourseProgressBar progress={data.values.stale!} testID="bar-stale" />

          <CourseProgressBar progress={data.values.error!} testID="bar-error" />

          <CourseProgressBar progress={data.values.course!} loading testID="bar-loading" />
        </View>
      </AppCard>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Every ring and bar exposes role=progressbar with min, max and now, plus the detail sentence as its accessible
        text — so a screen reader hears "5 of 12 lessons complete", not "forty two percent".
      </Text>
    </ScrollView>
  );
};
