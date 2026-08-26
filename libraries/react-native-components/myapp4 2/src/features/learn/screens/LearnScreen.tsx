import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AchievementsUsage,
  AssignmentSubmissionCardUsage,
  CourseCardUsage,
  DiscussionThreadItemUsage,
  FlashCardUsage,
  LeaderboardRowUsage,
  LessonListItemUsage,
  LiveClassBannerUsage,
  NoteTakerSheetUsage,
  ProgressUsage,
  QuizQuestionCardUsage,
  QuizResultCardUsage,
  VideoPlayerControlsUsage,
} from '@ui/education';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'course', title: 'CourseCard', description: 'Enrolled, locked, completed; progress unavailable vs zero', Component: CourseCardUsage },
  { key: 'lesson', title: 'LessonListItem', description: 'Playing, locked with reason, optional, failed attempt, offline', Component: LessonListItemUsage },
  { key: 'player', title: 'VideoPlayerControls + speed menu', description: '0.25x–2x, captions, transcript as a first-class control', Component: VideoPlayerControlsUsage },
  { key: 'question', title: 'QuizQuestionCard', description: 'Practice vs graded, no answer key on the client', Component: QuizQuestionCardUsage },
  { key: 'result', title: 'QuizResultCard', description: 'Accurate copy — no praise for a failed attempt', Component: QuizResultCardUsage },
  { key: 'progress', title: 'ProgressRing + CourseProgressBar', description: 'Never 100% before completion; detail beats percentage', Component: ProgressUsage },
  { key: 'achievements', title: 'Certificate + Streak + Badges', description: 'Playful and restrained modes; no shame on a reset streak', Component: AchievementsUsage },
  { key: 'flashcard', title: 'FlashCard', description: 'Show answer as a real button; scheduler stays outside', Component: FlashCardUsage },
  { key: 'leaderboard', title: 'LeaderboardRow', description: 'Ties, anonymity, opt-out, and a fully private mode', Component: LeaderboardRowUsage },
  { key: 'assignment', title: 'AssignmentSubmissionCard', description: 'Late is policy not error; resubmission confirms overwrite', Component: AssignmentSubmissionCardUsage },
  { key: 'live', title: 'LiveClassBanner', description: 'Countdown that stops at start; announced at thresholds', Component: LiveClassBannerUsage },
  { key: 'notes', title: 'NoteTakerSheet', description: 'Visible autosave state; conflicts never resolved silently', Component: NoteTakerSheetUsage },
  { key: 'discussion', title: 'DiscussionThreadItem', description: 'Roles in text, honest removal, blame-free empty state', Component: DiscussionThreadItemUsage },
];

export const LearnScreen = () => {
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
        title="Education component library"
        description="13 components, each with a sample JSON payload and a compiling usage example."
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
            testID={`learn-entry-${item.key}`}
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
