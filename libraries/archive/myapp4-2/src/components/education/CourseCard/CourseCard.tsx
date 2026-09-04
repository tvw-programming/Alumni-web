import React, { forwardRef, memo, useMemo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Chip, Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { RatingStars } from '@ui/atoms/RatingStars';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useMotion, usePressAnimation, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { CourseProgressBar } from '../Progress/CourseProgressBar';
import { useLearnTheme } from '../theme/educationTokens';
import type { CourseCardData, CourseLevel, EnrollmentState } from '../types/domain';

export type CourseCardVariant = 'catalog' | 'enrolled' | 'continue' | 'compact' | 'featured';

const LEVEL_META: Record<CourseLevel, { label: string; colorKey: 'levelBeginner' | 'levelIntermediate' | 'levelAdvanced' }> = {
  beginner: { label: 'Beginner', colorKey: 'levelBeginner' },
  intermediate: { label: 'Intermediate', colorKey: 'levelIntermediate' },
  advanced: { label: 'Advanced', colorKey: 'levelAdvanced' },
};

/** Default action copy per enrollment state — overridable via `actionLabel`. */
const ACTION_LABEL: Record<EnrollmentState, string> = {
  notEnrolled: 'Start course',
  inProgress: 'Continue learning',
  completed: 'Review course',
  locked: 'Locked',
};

export interface CourseCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  course: CourseCardData;
  variant?: CourseCardVariant;
  loading?: boolean;
  bookmarked?: boolean;
  onPress: (course: CourseCardData) => void;
  onAction?: (course: CourseCardData) => void;
  onBookmark?: (course: CourseCardData, next: boolean) => void;
  onExplainProgressRule?: (course: CourseCardData) => void;
  /** Enrollment failed — shown inline rather than as a vanishing toast. */
  errorMessage?: string;
  onRetry?: () => void;
}

/**
 * The catalogue and dashboard workhorse.
 *
 * Two deliberate choices: the course link is a distinct target from the bookmark
 * control (so the card is not one giant ambiguous tap area), and progress is
 * described in words as well as a bar — "5 of 12 lessons" is what a learner
 * actually needs, and it is what a screen reader hears.
 */
const CourseCardBase = forwardRef<View, CourseCardProps>(function CourseCard(
  {
    course,
    variant = 'catalog',
    loading = false,
    bookmarked = false,
    onPress,
    onAction,
    onBookmark,
    onExplainProgressRule,
    errorMessage,
    onRetry,
    animated = true,
    entering = false,
    index = 0,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: 'scale',
    animated,
    scaleTo: 0.98,
    disabled: course.enrollmentState === 'locked',
  });
  const [imageFailed, setImageFailed] = useState(false);

  const id = testID ?? `course-${course.id}`;
  const compact = variant === 'compact';
  const locked = course.enrollmentState === 'locked';
  const completed = course.enrollmentState === 'completed';
  const level = course.level ? LEVEL_META[course.level] : null;

  const accessibleName = useMemo(() => {
    const parts = [
      course.title,
      course.instructor ? `by ${course.instructor}` : course.provider,
      level?.label,
      course.lessonCount ? `${course.lessonCount} lessons` : undefined,
      course.duration,
      // Progress spoken as a sentence, never as a bare number.
      completed
        ? 'Course completed'
        : course.progress != null
          ? `${Math.round(course.progress)} percent complete`
          : 'Progress will appear after you begin',
      locked ? `Locked. ${course.lockedReason ?? ''}` : undefined,
      course.rating ? `rated ${course.rating.average} from ${course.rating.count} learners` : undefined,
    ];
    return parts.filter(Boolean).join(', ');
  }, [completed, course, level, locked]);

  if (loading) {
    return (
      <View
        style={[
          { backgroundColor: learn.colors.surfaceCourse, borderRadius: theme.radii.lg, overflow: 'hidden' },
          containerStyle,
        ]}
        testID={childTestID(id, 'skeleton')}
      >
        <SkeletonLoader shape="rect" height={compact ? 80 : 140} />
        <View style={{ padding: theme.spacing.md }}>
          <SkeletonLoader shape="text" lines={2} />
          <SkeletonLoader shape="text" lines={1} width="45%" height={10} containerStyle={{ marginTop: 8 }} />
        </View>
      </View>
    );
  }

  const media = (
    <View
      style={[
        styles.media,
        { aspectRatio: compact ? 1 : learn.layout.courseMediaAspectRatio, backgroundColor: theme.colors.surfaceVariant },
      ]}
    >
      {course.thumbnail.uri && !imageFailed ? (
        <Image
          source={{ uri: course.thumbnail.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onError={() => setImageFailed(true)}
          accessibilityElementsHidden
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.center, { padding: theme.spacing.sm }]}>
          <Icon source="book-open-variant" size={24} color={theme.colors.onSurfaceVariant} />
          <Text
            variant="labelSmall"
            numberOfLines={2}
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
          >
            {course.thumbnail.alt}
          </Text>
        </View>
      )}

      {locked ? (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.lockOverlay]}>
          <Icon source="lock" size={22} color="#FFFFFF" />
          <Text variant="labelSmall" style={{ color: '#FFFFFF', marginTop: 2 }}>
            Locked
          </Text>
        </View>
      ) : null}

      {completed ? (
        <View
          style={[
            styles.completedBadge,
            { backgroundColor: learn.colors.statusCompleted, borderRadius: theme.radii.sm },
          ]}
        >
          <Icon source="check" size={12} color="#FFFFFF" />
          <Text variant="labelSmall" style={{ color: '#FFFFFF', marginLeft: 2 }}>
            Completed
          </Text>
        </View>
      ) : null}

      {course.availableOffline ? (
        <View style={[styles.offlineBadge, { backgroundColor: theme.colors.backdrop, borderRadius: theme.radii.sm }]}>
          <Icon source="download-circle-outline" size={12} color={theme.colors.onSurface} />
        </View>
      ) : null}
    </View>
  );

  const details = (
    <View style={[{ padding: theme.spacing.md, gap: 4 }, compact && styles.flex]}>
      <Text variant="titleSmall" numberOfLines={2} testID={childTestID(id, 'title')}>
        {course.title}
      </Text>

      {course.instructor || course.provider ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {course.instructor ?? course.provider}
        </Text>
      ) : null}

      <View style={[styles.metaRow, { gap: theme.spacing.xs }]}>
        {level ? (
          <Chip compact textStyle={{ fontSize: 10 }} testID={childTestID(id, 'level')}>
            {level.label}
          </Chip>
        ) : null}
        {course.lessonCount ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {course.lessonCount} lessons
          </Text>
        ) : null}
        {course.duration ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {course.duration}
          </Text>
        ) : null}
      </View>

      {course.rating ? (
        <View style={[styles.metaRow, { gap: 4 }]}>
          <RatingStars value={course.rating.average} readonly allowHalf size="sm" entering={false} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {course.rating.average.toFixed(1)} ({course.rating.count.toLocaleString()})
          </Text>
        </View>
      ) : null}

      {locked && course.lockedReason ? (
        <View style={[styles.metaRow, { gap: 4 }]}>
          <Icon source="lock-outline" size={12} color={learn.colors.statusLocked} />
          <Text variant="labelSmall" style={{ color: learn.colors.statusLocked, flex: 1 }}>
            {course.lockedReason}
          </Text>
        </View>
      ) : null}

      {!locked && course.enrollmentState !== 'notEnrolled' ? (
        <View style={{ marginTop: theme.spacing.xs }}>
          <CourseProgressBar
            progress={{
              value: course.progress ?? 0,
              label: completed ? 'Course complete' : 'Course progress',
              status: completed ? 'complete' : course.progress == null ? 'error' : 'inProgress',
              detail:
                course.progress == null
                  ? 'Progress temporarily unavailable'
                  : course.lessonCount
                    ? `${Math.round(((course.progress ?? 0) / 100) * course.lessonCount)} of ${course.lessonCount} lessons complete`
                    : undefined,
              completionRule: course.completionRule,
            }}
            showPercentage
            animated={animated}
            onExplainRule={onExplainProgressRule ? () => onExplainProgressRule(course) : undefined}
            testID={childTestID(id, 'progress')}
          />
        </View>
      ) : null}

      {errorMessage ? (
        <View style={[styles.metaRow, { gap: 4, marginTop: theme.spacing.xs }]}>
          <Icon source="alert-circle-outline" size={12} color={learn.colors.statusOverdue} />
          <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue, flex: 1 }}>
            {errorMessage}
          </Text>
          {onRetry ? (
            <Text
              variant="labelSmall"
              onPress={onRetry}
              accessibilityRole="button"
              style={{ color: theme.colors.primary }}
            >
              Try again
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          backgroundColor: locked ? learn.colors.surfaceLocked : learn.colors.surfaceCourse,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.outlineVariant,
          overflow: 'hidden',
        },
        containerStyle,
        animatedStyle,
        style,
      ]}
      testID={id}
    >
      {/* The course link — a distinct target from the bookmark control. */}
      <TouchableRipple
        onPress={() => onPress(course)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="link"
        accessibilityLabel={accessibleName}
        accessibilityHint="Opens the course"
        testID={childTestID(id, 'link')}
      >
        <View style={compact ? styles.compactLayout : undefined}>
          <View style={compact ? { width: 92 } : undefined}>{media}</View>
          {details}
        </View>
      </TouchableRipple>

      <View style={[styles.footer, { paddingHorizontal: theme.spacing.md, paddingBottom: theme.spacing.md, gap: theme.spacing.sm }]}>
        {onAction ? (
          <AppButton
            variant={completed ? 'secondary' : 'primary'}
            size={compact ? 'sm' : 'md'}
            disabled={locked}
            onPress={() => onAction(course)}
            containerStyle={styles.flex}
            testID={childTestID(id, 'action')}
          >
            {course.actionLabel ?? ACTION_LABEL[course.enrollmentState]}
          </AppButton>
        ) : null}

        {onBookmark ? (
          <IconButton
            icon={bookmarked ? 'bookmark' : 'bookmark-outline'}
            size={20}
            onPress={() => onBookmark(course, !bookmarked)}
            // Separately labelled so it never merges into the course link.
            accessibilityLabel={bookmarked ? `Remove ${course.title} from saved` : `Save ${course.title} for later`}
            accessibilityState={{ selected: bookmarked }}
            style={{ margin: 0 }}
            testID={childTestID(id, 'bookmark')}
          />
        ) : null}
      </View>
    </Animated.View>
  );
});

export const CourseCard = memo(CourseCardBase);
CourseCard.displayName = 'CourseCard';

const styles = StyleSheet.create({
  media: { width: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  lockOverlay: { backgroundColor: 'rgba(0,0,0,0.45)' },
  completedBadge: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2 },
  offlineBadge: { position: 'absolute', top: 6, right: 6, padding: 3 },
  compactLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  metaRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  footer: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
