import { useCallback, useMemo } from 'react';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  LinearTransition,
  ReduceMotion,
  ZoomIn,
  withSpring,
  withTiming,
  type WithSpringConfig,
  type WithTimingConfig,
} from 'react-native-reanimated';

import { useAppTheme } from '@/theme';
import type { DurationToken, EasingToken, SpringToken } from '@/theme';

import { useReducedMotion } from './useReducedMotion';

/** Derived from the component itself, so it can never drift from Reanimated's types. */
export type EnteringAnimation = React.ComponentProps<typeof Animated.View>['entering'];
export type LayoutAnimation = React.ComponentProps<typeof Animated.View>['layout'];

/** Named presets only — consumers never hand us an easing curve. */
export type EnteringPreset = 'fade' | 'slideUp' | 'slideRight' | 'scale';
export type PressAnimation = 'scale' | 'opacity' | 'none';

export interface AnimatableProps {
  /** Global kill-switch for this component's motion. */
  animated?: boolean;
  /** Mount animation preset, or `false` to opt out. */
  entering?: EnteringPreset | false;
  /** Press feedback preset. */
  pressAnimation?: PressAnimation;
  /** Motion token name, or an explicit millisecond value when you must. */
  animationDuration?: DurationToken | number;
  /** Position in a list — drives the stagger delay for `entering`. */
  index?: number;
}

const BUILDERS = {
  fade: FadeIn,
  slideUp: FadeInDown,
  slideRight: FadeInRight,
  scale: ZoomIn,
} as const;

export interface Motion {
  /** False when the user asked for reduced motion, or `animated={false}`. */
  enabled: boolean;
  /** Resolve a duration token (or raw ms) to milliseconds. Returns 0 when disabled. */
  ms: (value?: DurationToken | number, fallback?: DurationToken) => number;
  timing: (value?: DurationToken | number, easing?: EasingToken) => WithTimingConfig;
  spring: (token?: SpringToken) => WithSpringConfig;
  /** Build a mount animation from a preset name. */
  entering: (preset: EnteringPreset | false | undefined, index?: number) => EnteringAnimation;
  /** Layout transition for reflowing containers; undefined when motion is off. */
  layout: LayoutAnimation;
}

export function useMotion(options: Pick<AnimatableProps, 'animated' | 'animationDuration'> = {}): Motion {
  const { animated = true, animationDuration } = options;
  const theme = useAppTheme();
  const reduced = useReducedMotion();
  const enabled = animated && !reduced;

  const ms = useCallback(
    (value: DurationToken | number | undefined = animationDuration, fallback: DurationToken = 'base') => {
      if (!enabled) return 0;
      const resolved = value ?? animationDuration ?? fallback;
      return typeof resolved === 'number' ? resolved : theme.motion.duration[resolved];
    },
    [enabled, animationDuration, theme.motion.duration],
  );

  return useMemo<Motion>(() => {
    const timing = (value?: DurationToken | number, easing: EasingToken = 'standard'): WithTimingConfig => ({
      duration: ms(value),
      easing: theme.motion.easing[easing],
    });

    // When motion is off we let Reanimated snap to the target value itself
    // rather than hand-rolling a "fast" spring that still animates.
    const spring = (token: SpringToken = 'gentle'): WithSpringConfig => ({
      ...theme.motion.spring[token],
      reduceMotion: enabled ? ReduceMotion.Never : ReduceMotion.Always,
    });

    const entering = (preset: EnteringPreset | false | undefined, index = 0): EnteringAnimation => {
      if (!enabled || !preset) return undefined;
      const delay = Math.min(index * theme.motion.stagger.item, theme.motion.stagger.max);
      return BUILDERS[preset].duration(ms(undefined, 'base')).delay(delay);
    };

    return {
      enabled,
      ms,
      timing,
      spring,
      entering,
      layout: enabled ? LinearTransition.springify().damping(theme.motion.spring.gentle.damping) : undefined,
    };
  }, [enabled, ms, theme.motion]);
}

/** Convenience for the very common "animate a numeric shared value" case. */
export const springTo = (value: number, config: WithSpringConfig) => withSpring(value, config);
export const timeTo = (value: number, config: WithTimingConfig) => withTiming(value, config);
