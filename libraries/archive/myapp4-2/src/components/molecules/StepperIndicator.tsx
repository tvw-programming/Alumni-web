import React, { forwardRef, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { StyleEscapeHatches } from '../primitives';

export interface Step {
  key: string;
  label: string;
}

export interface StepperIndicatorProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'animationDuration'> {
  steps: Step[];
  /** Zero-based index of the active step. */
  current: number;
  orientation?: 'horizontal' | 'vertical';
  variant?: 'dots' | 'bar' | 'numbered';
  /** Allow tapping a completed step to go back. */
  allowBack?: boolean;
  onStepPress?: (index: number) => void;
}

interface StepDotProps {
  index: number;
  label: string;
  state: 'done' | 'active' | 'todo';
  variant: 'dots' | 'numbered';
  animated: boolean;
  onPress?: () => void;
  testID?: string;
}

const StepDot = React.memo(function StepDot({ index, label, state, variant, animated, onPress, testID }: StepDotProps) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const scale = useSharedValue(state === 'done' ? 1 : 0.85);

  useEffect(() => {
    const target = state === 'todo' ? 0.85 : 1;
    scale.value = motion.enabled ? withSpring(target, theme.motion.spring.bouncy) : target;
  }, [motion.enabled, scale, state, theme.motion.spring.bouncy]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const background =
    state === 'done' ? theme.colors.primary : state === 'active' ? theme.colors.primaryContainer : theme.colors.surfaceVariant;
  const foreground =
    state === 'done' ? theme.colors.onPrimary : state === 'active' ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant;
  const size = theme.sizing.control.sm;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={styles.step}
      accessibilityRole="button"
      accessibilityLabel={`Step ${index + 1}: ${label}`}
      accessibilityState={{ selected: state === 'active', disabled: !onPress }}
      testID={childTestID(testID, `step-${index}`)}
    >
      <Animated.View
        style={[
          styles.dot,
          style,
          { width: size, height: size, borderRadius: theme.radii.pill, backgroundColor: background },
        ]}
      >
        {state === 'done' ? (
          <Icon source="check" size={theme.sizing.icon.sm} color={foreground} />
        ) : variant === 'numbered' ? (
          <Text variant="labelMedium" style={{ color: foreground }}>
            {index + 1}
          </Text>
        ) : null}
      </Animated.View>
      <Text
        variant="labelSmall"
        numberOfLines={1}
        style={{ marginTop: theme.spacing.xs, color: state === 'todo' ? theme.colors.onSurfaceVariant : theme.colors.onSurface }}
      >
        {label}
      </Text>
    </Pressable>
  );
});

export const StepperIndicator = forwardRef<View, StepperIndicatorProps>(function StepperIndicator(
  {
    steps,
    current,
    orientation = 'horizontal',
    variant = 'numbered',
    allowBack = false,
    onStepPress,
    animated = true,
    animationDuration,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated, animationDuration });
  const progress = useSharedValue(0);

  const target = steps.length > 1 ? current / (steps.length - 1) : 1;
  useEffect(() => {
    progress.value = motion.enabled ? withTiming(target, motion.timing(undefined, 'emphasized')) : target;
    // `motion.timing` is recreated per render; the target is what matters here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, motion.enabled]);

  const barStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }));

  const label = `Step ${current + 1} of ${steps.length}: ${steps[current]?.label ?? ''}`;

  if (variant === 'bar') {
    return (
      <View
        ref={ref}
        style={[{ gap: theme.spacing.xs }, containerStyle, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={label}
        accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
        testID={testID}
      >
        <Text variant="labelMedium">{steps[current]?.label}</Text>
        <ProgressBar progress={target} color={theme.colors.primary} style={{ height: 6, borderRadius: theme.radii.pill }} />
      </View>
    );
  }

  return (
    <View
      ref={ref}
      style={[
        orientation === 'vertical' ? styles.vertical : styles.horizontal,
        containerStyle,
        style,
      ]}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
      testID={testID}
    >
      {orientation === 'horizontal' && (
        <View style={[styles.rail, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Animated.View style={[styles.railFill, barStyle, { backgroundColor: theme.colors.primary }]} />
        </View>
      )}

      {steps.map((step, i) => (
        <StepDot
          key={step.key}
          index={i}
          label={step.label}
          state={i < current ? 'done' : i === current ? 'active' : 'todo'}
          variant={variant}
          animated={animated}
          onPress={allowBack && i < current && onStepPress ? () => onStepPress(i) : undefined}
          testID={testID}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  horizontal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  vertical: { flexDirection: 'column', gap: 12 },
  step: { alignItems: 'center', flex: 1 },
  dot: { alignItems: 'center', justifyContent: 'center' },
  rail: { position: 'absolute', left: '10%', right: '10%', top: 15, height: 2 },
  railFill: { height: 2 },
});
