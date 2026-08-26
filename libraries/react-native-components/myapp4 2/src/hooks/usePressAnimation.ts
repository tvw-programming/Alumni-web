import { useMemo } from 'react';
import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';

import { useMotion, type PressAnimation } from './useMotion';

export interface PressAnimationOptions {
  animation?: PressAnimation;
  animated?: boolean;
  disabled?: boolean;
  /** How far to shrink on press. 0.97 for buttons, 0.98 for cards. */
  scaleTo?: number;
}

export interface PressAnimationResult {
  animatedStyle: ReturnType<typeof useAnimatedStyle>;
  onPressIn: () => void;
  onPressOut: () => void;
}

/**
 * Shared press feedback. Runs entirely on the UI thread, so it stays smooth even
 * while the JS thread is busy rendering the screen the press navigates to.
 */
export function usePressAnimation({
  animation = 'scale',
  animated = true,
  disabled = false,
  scaleTo = 0.97,
}: PressAnimationOptions = {}): PressAnimationResult {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const active = motion.enabled && animation !== 'none' && !disabled;

  const progress = useSharedValue(0);
  const spring = theme.motion.spring.snappy;
  const pressedOpacity = theme.opacity.pressed;

  const animatedStyle = useAnimatedStyle(() => {
    if (animation === 'opacity') {
      return { opacity: 1 - progress.value * (1 - pressedOpacity) };
    }
    return { transform: [{ scale: 1 - progress.value * (1 - scaleTo) }] };
  }, [animation, scaleTo, pressedOpacity]);

  return useMemo(
    () => ({
      animatedStyle,
      onPressIn: () => {
        if (!active) return;
        progress.value = animation === 'opacity' ? withTiming(1, { duration: 80 }) : withSpring(1, spring);
      },
      onPressOut: () => {
        if (!active) return;
        progress.value = animation === 'opacity' ? withTiming(0, { duration: 120 }) : withSpring(0, spring);
      },
    }),
    [active, animation, animatedStyle, progress, spring],
  );
}
