import React, { createContext, forwardRef, useContext, useEffect, useMemo } from 'react';
import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { useMotion } from '@/hooks';
import { useAppTheme } from '@/theme';

import type { StyleEscapeHatches } from '../primitives';

/**
 * ONE shimmer clock for the whole tree.
 *
 * A 20-row skeleton list running 20 independent `withRepeat` loops is a
 * measurable frame-rate problem; one shared value driving 20 derived styles is
 * not. That is the entire reason this provider exists.
 */
const ShimmerContext = createContext<SharedValue<number> | null>(null);

export const ShimmerProvider = ({ children }: { children: React.ReactNode }) => {
  const progress = useSharedValue(0);
  const motion = useMotion();

  useEffect(() => {
    if (!motion.enabled) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(progress);
  }, [motion.enabled, progress]);

  return <ShimmerContext.Provider value={progress}>{children}</ShimmerContext.Provider>;
};

export type SkeletonShape = 'text' | 'circle' | 'rect' | 'card' | 'listItem';

export interface SkeletonLoaderProps extends StyleEscapeHatches {
  shape?: SkeletonShape;
  /** Number of text lines when `shape="text"`. */
  lines?: number;
  width?: DimensionValue;
  height?: number;
  /** Repeat the whole shape `count` times. */
  count?: number;
}

const useShimmerStyle = () => {
  const theme = useAppTheme();
  const progress = useContext(ShimmerContext);

  if (__DEV__ && !progress) {
    console.warn('[Skeleton] No <ShimmerProvider> found — rendering static placeholders.');
  }

  const base = theme.colors.skeleton;
  const highlight = theme.colors.skeletonHighlight;

  // Hooks must run unconditionally; a null clock simply never advances.
  const fallback = useSharedValue(0);
  const clock = progress ?? fallback;

  return useAnimatedStyle(
    () => ({ backgroundColor: interpolateColor(clock.value, [0, 1], [base, highlight]) }),
    [base, highlight],
  );
};

type BoneStyle = ViewStyle | ViewStyle[];

const Bone = ({ style }: { style: BoneStyle }) => {
  const shimmer = useShimmerStyle();
  return <Animated.View style={[style, shimmer]} />;
};

export const SkeletonLoader = forwardRef<View, SkeletonLoaderProps>(function SkeletonLoader(
  { shape = 'text', lines = 3, width = '100%', height, count = 1, style, containerStyle, testID },
  ref,
) {
  const theme = useAppTheme();

  const content = useMemo(() => {
    const radius = { borderRadius: theme.radii.sm };

    switch (shape) {
      case 'circle': {
        const size = height ?? theme.sizing.avatar.md;
        return <Bone style={[{ width: size, height: size, borderRadius: theme.radii.pill }]} />;
      }
      case 'rect':
        return <Bone style={[{ width, height: height ?? 120 }, radius]} />;
      case 'card':
        return (
          <View style={{ gap: theme.spacing.sm }}>
            <Bone style={[{ width, height: height ?? 140 }, { borderRadius: theme.radii.lg }]} />
            <Bone style={[{ width: '70%', height: 14 }, radius]} />
            <Bone style={[{ width: '45%', height: 12 }, radius]} />
          </View>
        );
      case 'listItem':
        return (
          <View style={[styles.row, { gap: theme.spacing.md }]}>
            <Bone
              style={[
                {
                  width: theme.sizing.avatar.md,
                  height: theme.sizing.avatar.md,
                  borderRadius: theme.radii.pill,
                },
              ]}
            />
            <View style={{ flex: 1, gap: theme.spacing.xs }}>
              <Bone style={[{ width: '60%', height: 14 }, radius]} />
              <Bone style={[{ width: '35%', height: 12 }, radius]} />
            </View>
          </View>
        );
      case 'text':
      default:
        return (
          <View style={{ gap: theme.spacing.xs }}>
            {Array.from({ length: lines }).map((_, i) => (
              <Bone
                key={i}
                style={[
                  { width: i === lines - 1 ? '55%' : width, height: height ?? 12 },
                  radius,
                ]}
              />
            ))}
          </View>
        );
    }
  }, [height, lines, shape, theme, width]);

  return (
    <View
      ref={ref}
      style={[{ gap: theme.spacing.md }, containerStyle, style]}
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      testID={testID}
    >
      {Array.from({ length: count }).map((_, i) => (
        <View key={i}>{content}</View>
      ))}
    </View>
  );
});

export interface SkeletonListProps extends StyleEscapeHatches {
  of?: SkeletonShape;
  count?: number;
}

/** `<SkeletonList of="listItem" count={6} />` — the shape most screens need. */
export const SkeletonList = ({ of = 'listItem', count = 6, ...rest }: SkeletonListProps) => (
  <SkeletonLoader shape={of} count={count} {...rest} />
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
