import { useCallback } from 'react';
import {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { useMotion } from './useMotion';

/**
 * Error shake, exposed imperatively so a form can shake the *first invalid*
 * field on submit rather than every field animating on every keystroke.
 */
export function useShake(animated = true, amplitude = 6) {
  const offset = useSharedValue(0);
  const motion = useMotion({ animated });

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: offset.value }] }));

  const shake = useCallback(() => {
    if (!motion.enabled) return;
    const step: WithTimingConfig = { duration: 45 };
    offset.value = withSequence(
      withTiming(-amplitude, step),
      withTiming(amplitude, step),
      withTiming(-amplitude * 0.6, step),
      withTiming(amplitude * 0.6, step),
      withTiming(0, step),
    );
  }, [amplitude, motion.enabled, offset]);

  return { style, shake };
}
