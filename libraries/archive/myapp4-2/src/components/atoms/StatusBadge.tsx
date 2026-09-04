import React, { createContext, forwardRef, useContext, useEffect, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { resolveIntent, useAppTheme, type Intent } from '@/theme';

import type { Size, StyleEscapeHatches } from '../primitives';

/**
 * The domain's statuses are configuration, not code. A fintech app maps
 * `paid → success`; a logistics app maps `delivered → success`. Same component.
 */
export type StatusMap = Record<string, Intent>;

const StatusMapContext = createContext<StatusMap>({});

export interface StatusBadgeProviderProps {
  map: StatusMap;
  children: React.ReactNode;
}

export const StatusBadgeProvider = ({ map, children }: StatusBadgeProviderProps) => {
  const parent = useContext(StatusMapContext);
  // Nested providers merge, so a screen can extend the app-wide map locally.
  const merged = useMemo(() => ({ ...parent, ...map }), [parent, map]);
  return <StatusMapContext.Provider value={merged}>{children}</StatusMapContext.Provider>;
};

export type BadgeShape = 'pill' | 'dot' | 'square';

export interface StatusBadgeProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  /** Domain status key, resolved through the nearest `StatusBadgeProvider`. */
  status: string;
  /** Defaults to a title-cased `status`. */
  label?: string;
  size?: Size;
  shape?: BadgeShape;
  withDot?: boolean;
  /** Looped pulse for live/pending states. */
  pulse?: boolean;
}

const titleCase = (value: string) =>
  value.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const StatusBadge = forwardRef<View, StatusBadgeProps>(function StatusBadge(
  { status, label, size = 'md', shape = 'pill', withDot = false, pulse = false, animated = true, style, containerStyle, testID },
  ref,
) {
  const theme = useAppTheme();
  const map = useContext(StatusMapContext);
  const motion = useMotion({ animated });
  const intent = resolveIntent(theme, map[status] ?? 'neutral');

  const progress = useSharedValue(0);
  const shouldPulse = pulse && motion.enabled;

  useEffect(() => {
    if (!shouldPulse) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    progress.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 700, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
    return () => cancelAnimation(progress);
  }, [progress, shouldPulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.45,
    transform: [{ scale: 1 + progress.value * 0.12 }],
  }));

  const dotSize = theme.sizing.icon[size] / 2.5;
  const text = label ?? titleCase(status);

  const shapeStyle: ViewStyle = {
    borderRadius: shape === 'square' ? theme.radii.sm : theme.radii.pill,
    backgroundColor: intent.container,
    paddingVertical: size === 'sm' ? theme.spacing.xxs : theme.spacing.xs,
    paddingHorizontal: shape === 'dot' ? 0 : theme.spacing.sm,
  };

  if (shape === 'dot') {
    return (
      <Animated.View
        ref={ref}
        style={[{ width: dotSize * 2, height: dotSize * 2, borderRadius: theme.radii.pill, backgroundColor: intent.main }, containerStyle, style, pulseStyle]}
        accessibilityRole="image"
        accessibilityLabel={text}
        testID={testID}
      />
    );
  }

  return (
    <Animated.View
      ref={ref}
      style={[styles.row, shapeStyle, containerStyle, style, pulseStyle]}
      accessibilityRole="text"
      accessibilityLabel={text}
      testID={testID}
    >
      {withDot && (
        <View
          style={{
            width: dotSize,
            height: dotSize,
            borderRadius: theme.radii.pill,
            backgroundColor: intent.main,
            marginRight: theme.spacing.xs,
          }}
        />
      )}
      <Text
        variant="labelMedium"
        style={{ color: intent.onContainer, fontSize: theme.typography.label[size] }}
        numberOfLines={1}
      >
        {text}
      </Text>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
});
