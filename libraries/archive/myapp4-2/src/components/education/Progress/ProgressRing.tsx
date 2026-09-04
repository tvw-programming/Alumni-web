import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { ProgressValue } from '../types/domain';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface ProgressRingProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  progress: ProgressValue;
  size?: number;
  strokeWidth?: number;
  /** Rendered in the hole. Defaults to the rounded percentage. */
  center?: React.ReactNode;
  /** Consistent rounding across the product — never floor here and round there. */
  precision?: 0 | 1;
  compact?: boolean;
}

/**
 * Circular progress.
 *
 * The SVG is hidden from assistive tech and the whole component carries a single
 * `progressbar` role with min/max/now — a screen reader announcing an arc path
 * helps nobody. The numeric percentage is always rendered as text too, because
 * a ring alone is not a value.
 */
export const ProgressRing = ({
  progress,
  size,
  strokeWidth,
  center,
  precision = 0,
  compact = false,
  animated = true,
  style,
  containerStyle,
  testID,
}: ProgressRingProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const dimension = size ?? learn.layout.progressRingSize;
  const stroke = strokeWidth ?? learn.layout.progressRingStroke;
  const radius = (dimension - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const min = progress.min ?? 0;
  const max = progress.max ?? 100;
  const clamped = Math.max(min, Math.min(max, progress.value));
  const fraction = max > min ? (clamped - min) / (max - min) : 0;

  const complete = progress.status === 'complete' || fraction >= 1;
  const color = complete
    ? learn.colors.progressComplete
    : progress.status === 'error' || progress.status === 'stale'
      ? learn.colors.progressStale
      : learn.colors.progressValue;

  const animatedFraction = useSharedValue(motion.enabled ? 0 : fraction);

  useEffect(() => {
    animatedFraction.value = motion.enabled
      ? withTiming(fraction, motion.timing('slow', 'emphasized'))
      : fraction;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fraction, motion.enabled]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedFraction.value),
  }));

  const percentText = useMemo(
    () => `${(fraction * 100).toFixed(precision)}%`,
    [fraction, precision],
  );

  return (
    <View
      style={[{ width: dimension, height: dimension }, styles.center, containerStyle, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={progress.label}
      accessibilityValue={{ min, max, now: clamped, text: `${percentText}${progress.detail ? `, ${progress.detail}` : ''}` }}
      testID={testID}
    >
      <Svg
        width={dimension}
        height={dimension}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <G rotation={-90} origin={`${dimension / 2}, ${dimension / 2}`}>
          <Circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={learn.colors.progressTrack}
            strokeWidth={stroke}
            fill="none"
          />
          <AnimatedCircle
            cx={dimension / 2}
            cy={dimension / 2}
            r={radius}
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeLinecap="round"
            fill="none"
            animatedProps={animatedProps}
          />
        </G>
      </Svg>

      <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
        {center ?? (
          <>
            {/* The number is the value; the ring is the decoration. */}
            <Text variant={compact ? 'titleSmall' : 'titleLarge'} style={styles.tabular}>
              {percentText}
            </Text>
            {!compact && progress.detail ? (
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
                numberOfLines={2}
              >
                {progress.detail}
              </Text>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
});
