import React, { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { LessonItem, LessonState, LessonType } from '../types/domain';

const TYPE_META: Record<LessonType, { label: string; icon: string; colorKey: 'lessonVideo' | 'lessonReading' | 'lessonQuiz' | 'lessonAssignment' | 'lessonProject' }> = {
  video: { label: 'Video', icon: 'play-circle-outline', colorKey: 'lessonVideo' },
  reading: { label: 'Reading', icon: 'text-box-outline', colorKey: 'lessonReading' },
  quiz: { label: 'Quiz', icon: 'help-circle-outline', colorKey: 'lessonQuiz' },
  assignment: { label: 'Assignment', icon: 'clipboard-text-outline', colorKey: 'lessonAssignment' },
  project: { label: 'Project', icon: 'hammer-wrench', colorKey: 'lessonProject' },
};

/** State copy. Every entry has a word — a bare checkmark or lock is not enough. */
const STATE_META: Record<LessonState, { label: string; icon: string }> = {
  notStarted: { label: 'Not started', icon: 'circle-outline' },
  playing: { label: 'Now playing', icon: 'play-circle' },
  completed: { label: 'Completed', icon: 'check-circle' },
  locked: { label: 'Locked', icon: 'lock' },
  loading: { label: 'Loading', icon: 'progress-clock' },
  downloading: { label: 'Downloading', icon: 'download' },
  downloaded: { label: 'Available offline', icon: 'download-circle' },
  error: { label: 'Unavailable', icon: 'alert-circle-outline' },
};

export interface LessonListItemProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  lesson: LessonItem;
  /** 1-based position, spoken in the accessible name. */
  position?: number;
  onPress?: (lesson: LessonItem) => void;
  onDownload?: (lesson: LessonItem) => void;
  onRetry?: (lesson: LessonItem) => void;
  showType?: boolean;
  compact?: boolean;
}

/**
 * A row in the course curriculum.
 *
 * The accessible name carries the whole state — "Lesson 4, Introduction to
 * Algebra, completed, 12 minutes" — because a checkmark glyph conveys nothing
 * to a screen reader. Opening a lesson does not mark it complete; that rule
 * belongs to the course service, and this row only reports what it is told.
 */
export const LessonListItem = memo(function LessonListItem({
  lesson,
  position,
  onPress,
  onDownload,
  onRetry,
  showType = true,
  compact = false,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: LessonListItemProps) {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `lesson-${lesson.id}`;
  const typeMeta = TYPE_META[lesson.type];
  const stateMeta = STATE_META[lesson.state];

  const playing = lesson.state === 'playing';
  const locked = lesson.state === 'locked';
  const completed = lesson.state === 'completed';
  const errored = lesson.state === 'error';

  const stateColor = completed
    ? learn.colors.statusCompleted
    : playing
      ? learn.colors.statusInProgress
      : locked
        ? learn.colors.statusLocked
        : errored
          ? learn.colors.statusOverdue
          : learn.colors.statusNotStarted;

  /** The full sentence a screen reader should hear. */
  const accessibleName = useMemo(
    () =>
      [
        position ? `Lesson ${position}` : undefined,
        lesson.title,
        showType ? typeMeta.label : undefined,
        stateMeta.label,
        lesson.duration,
        lesson.optional ? 'optional, not required for completion' : undefined,
        lesson.attemptFailed ? 'previous attempt not passed' : undefined,
        locked && lesson.lockedReason ? lesson.lockedReason : undefined,
        errored && lesson.errorMessage ? lesson.errorMessage : undefined,
      ]
        .filter(Boolean)
        .join(', '),
    [errored, lesson, locked, position, showType, stateMeta.label, typeMeta.label],
  );

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          backgroundColor: playing ? learn.colors.surfaceSelected : theme.colors.surface,
          borderLeftWidth: playing ? 3 : 0,
          borderLeftColor: learn.colors.statusInProgress,
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <TouchableRipple
        onPress={onPress && !locked ? () => onPress(lesson) : undefined}
        disabled={!onPress || locked}
        // The whole row is one keyboard-activatable target.
        accessibilityRole="button"
        accessibilityLabel={accessibleName}
        accessibilityState={{ disabled: locked, selected: playing }}
        testID={childTestID(id, 'row')}
      >
        <View
          style={[
            styles.row,
            { minHeight: compact ? 52 : learn.layout.lessonRowHeight, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, gap: theme.spacing.sm },
          ]}
        >
          {/* Status glyph + colour, always backed by the text below. */}
          <View style={styles.statusWell}>
            {lesson.state === 'loading' || lesson.state === 'downloading' ? (
              <ActivityIndicator size={16} />
            ) : (
              <Icon source={stateMeta.icon} size={20} color={stateColor} />
            )}
          </View>

          <View style={styles.flex}>
            <Text
              variant="bodyMedium"
              numberOfLines={2}
              style={{ color: locked ? theme.colors.onSurfaceVariant : theme.colors.onSurface }}
              testID={childTestID(id, 'title')}
            >
              {position ? `${position}. ` : ''}
              {lesson.title}
            </Text>

            <View style={[styles.metaRow, { gap: theme.spacing.xs }]}>
              {showType ? (
                <View style={[styles.metaRow, { gap: 3 }]}>
                  <Icon source={typeMeta.icon} size={12} color={learn.colors[typeMeta.colorKey]} />
                  <Text variant="labelSmall" style={{ color: learn.colors[typeMeta.colorKey] }}>
                    {typeMeta.label}
                  </Text>
                </View>
              ) : null}

              {lesson.duration ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {lesson.duration}
                </Text>
              ) : null}

              {/* Optional content is excluded from completion — say so. */}
              {lesson.optional ? (
                <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Optional
                </Text>
              ) : null}

              {/* Status word, so the glyph is never the only signal. */}
              {lesson.state !== 'notStarted' ? (
                <Text variant="labelSmall" style={{ color: stateColor }}>
                  {stateMeta.label}
                </Text>
              ) : null}
            </View>

            {lesson.attemptFailed ? (
              <Text variant="labelSmall" style={{ color: learn.colors.statusFailed }}>
                Previous attempt not passed — you can try again
              </Text>
            ) : null}

            {locked && lesson.lockedReason ? (
              <Text variant="labelSmall" style={{ color: learn.colors.statusLocked }}>
                {lesson.lockedReason}
              </Text>
            ) : null}

            {errored ? (
              <View style={[styles.metaRow, { gap: 4 }]}>
                <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue, flex: 1 }}>
                  {lesson.errorMessage ?? 'This lesson is unavailable right now.'}
                </Text>
                {onRetry ? (
                  <Text
                    variant="labelSmall"
                    onPress={() => onRetry(lesson)}
                    accessibilityRole="button"
                    style={{ color: theme.colors.primary }}
                    testID={childTestID(id, 'retry')}
                  >
                    Retry
                  </Text>
                ) : null}
              </View>
            ) : null}

            {lesson.progress != null && lesson.progress > 0 && !completed ? (
              <ProgressBar
                progress={lesson.progress / 100}
                color={learn.colors.progressValue}
                style={{ height: 3, borderRadius: theme.radii.pill, marginTop: 4 }}
                accessibilityLabel={`${Math.round(lesson.progress)} percent watched`}
              />
            ) : null}

            {lesson.state === 'downloading' && lesson.downloadProgress != null ? (
              <ProgressBar
                progress={lesson.downloadProgress}
                style={{ height: 3, borderRadius: theme.radii.pill, marginTop: 4 }}
                accessibilityLabel={`Downloading, ${Math.round(lesson.downloadProgress * 100)} percent`}
              />
            ) : null}
          </View>

          {onDownload && !locked && lesson.state !== 'downloading' ? (
            <TouchableRipple
              onPress={() => onDownload(lesson)}
              borderless
              style={styles.downloadButton}
              accessibilityRole="button"
              accessibilityLabel={
                lesson.state === 'downloaded'
                  ? `${lesson.title} is available offline`
                  : `Download ${lesson.title} for offline`
              }
              testID={childTestID(id, 'download')}
            >
              <Icon
                source={lesson.state === 'downloaded' ? 'download-circle' : 'download-outline'}
                size={20}
                color={lesson.state === 'downloaded' ? learn.colors.statusCompleted : theme.colors.onSurfaceVariant}
              />
            </TouchableRipple>
          ) : null}
        </View>
      </TouchableRipple>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  statusWell: { width: 24, alignItems: 'center' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  downloadButton: { padding: 6, borderRadius: 20 },
  flex: { flex: 1 },
});
