import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { ProgressValue } from '../types/domain';

export interface Milestone {
  /** 0–100. */
  at: number;
  label: string;
  reached?: boolean;
}

export interface CourseProgressBarProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  progress: ProgressValue;
  milestones?: Milestone[];
  /** Indeterminate while the real value is unknown. */
  loading?: boolean;
  showPercentage?: boolean;
  /** What the learner can do next — progress as wayfinding, not decoration. */
  nextAction?: { label: string; onPress: () => void };
  precision?: 0 | 1;
  onExplainRule?: () => void;
}

/**
 * Linear progress with a label that says something useful.
 *
 * "25% complete" alone is decoration; "3 of 12 lessons · 2 more to finish this
 * module" tells the learner what to do next. The bar refuses to imply 100%
 * unless `status` says complete, so a course with an ungraded final project
 * cannot round up to finished.
 */
export const CourseProgressBar = ({
  progress,
  milestones = [],
  loading = false,
  showPercentage = true,
  nextAction,
  precision = 0,
  onExplainRule,
  animated = true,
  style,
  containerStyle,
  testID,
}: CourseProgressBarProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const min = progress.min ?? 0;
  const max = progress.max ?? 100;
  const clamped = Math.max(min, Math.min(max, progress.value));
  const rawFraction = max > min ? (clamped - min) / (max - min) : 0;

  // Never render a full bar unless the status genuinely says complete.
  const fraction = progress.status === 'complete' ? 1 : Math.min(rawFraction, 0.99);

  const complete = progress.status === 'complete';
  const stale = progress.status === 'stale' || progress.status === 'error';

  const color = complete
    ? learn.colors.progressComplete
    : stale
      ? learn.colors.progressStale
      : learn.colors.progressValue;

  const width = useSharedValue(motion.enabled ? 0 : fraction);
  useEffect(() => {
    width.value = motion.enabled ? withTiming(fraction, motion.timing('slow', 'emphasized')) : fraction;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction, motion.enabled]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${width.value * 100}%` }));

  const percentText = useMemo(() => `${(rawFraction * 100).toFixed(precision)}%`, [precision, rawFraction]);

  if (loading) {
    return (
      <View style={[{ gap: 4 }, containerStyle, style]} testID={childTestID(testID, 'loading')}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Loading progress…
        </Text>
        <ProgressBar
          indeterminate
          style={{ height: learn.layout.progressBarHeight, borderRadius: theme.radii.pill }}
          accessibilityLabel="Loading progress"
        />
      </View>
    );
  }

  return (
    <View
      style={[{ gap: 4 }, containerStyle, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={progress.label}
      accessibilityValue={{
        min,
        max,
        now: clamped,
        text: `${percentText}${progress.detail ? `, ${progress.detail}` : ''}`,
      }}
      testID={testID}
    >
      <View style={styles.row}>
        <Text variant="labelMedium" style={styles.flex} numberOfLines={2}>
          {progress.label}
        </Text>
        {showPercentage ? (
          <Text variant="labelMedium" style={[styles.tabular, { color }]}>
            {complete ? 'Complete' : percentText}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.track,
          { height: learn.layout.progressBarHeight, backgroundColor: learn.colors.progressTrack, borderRadius: theme.radii.pill },
        ]}
      >
        <Animated.View style={[styles.fill, fillStyle, { backgroundColor: color, borderRadius: theme.radii.pill }]} />

        {milestones.map((milestone) => (
          <View
            key={milestone.label}
            style={[
              styles.milestone,
              {
                left: `${milestone.at}%`,
                backgroundColor: milestone.reached ? learn.colors.progressComplete : theme.colors.surface,
                borderColor: milestone.reached ? learn.colors.progressComplete : learn.colors.progressTrack,
              },
            ]}
          />
        ))}
      </View>

      {/* The sentence a percentage cannot say. */}
      {progress.detail ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {progress.detail}
        </Text>
      ) : null}

      {stale ? (
        <View style={[styles.row, { gap: 4 }]}>
          <Icon source="cloud-off-outline" size={12} color={learn.colors.progressStale} />
          <Text variant="labelSmall" style={{ color: learn.colors.progressStale }}>
            {progress.status === 'error' ? 'Progress temporarily unavailable' : 'Progress may be out of date'}
          </Text>
        </View>
      ) : null}

      <View style={[styles.row, { gap: theme.spacing.md }]}>
        {nextAction ? (
          <TouchableRipple
            onPress={nextAction.onPress}
            accessibilityRole="button"
            accessibilityLabel={nextAction.label}
            testID={childTestID(testID, 'next')}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              {nextAction.label}
            </Text>
          </TouchableRipple>
        ) : null}

        {/* What counts toward this number is never a mystery. */}
        {onExplainRule && progress.completionRule ? (
          <TouchableRipple
            onPress={onExplainRule}
            accessibilityRole="button"
            accessibilityLabel="What counts toward progress?"
            testID={childTestID(testID, 'rule')}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              What counts?
            </Text>
          </TouchableRipple>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  track: { width: '100%', overflow: 'hidden', position: 'relative' },
  fill: { height: '100%' },
  milestone: { position: 'absolute', top: -2, width: 10, height: 10, borderRadius: 5, borderWidth: 2, marginLeft: -5 },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
