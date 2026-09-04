import React, { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';

import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';

export interface ScoreCounterProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  value: number;
  delta?: number;
  label?: string;
  isPersonalBest?: boolean;
  onMilestone?: () => void;
}

/**
 * A subtle scale animation marks a score change under normal motion, and an
 * instant text update replaces it when reduced motion is active — the number
 * itself is always the source of truth, never the animation.
 */
export const ScoreCounter = ({ value, delta, label = 'Score', isPersonalBest = false, onMilestone, animated = true, style, containerStyle, testID }: ScoreCounterProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? 'score-counter';
  const { enabled: motionOn } = useMotion({ animated });
  const scale = useSharedValue(1);
  const prevValue = useRef(value);
  const prevBest = useRef(isPersonalBest);

  useEffect(() => {
    if (value !== prevValue.current) {
      if (motionOn) {
        scale.value = withSequence(withTiming(1.12, { duration: 120 }), withTiming(1, { duration: 160 }));
      }
      prevValue.current = value;
    }
    // "New personal best" is the one milestone this component can detect on
    // its own, without an externally supplied threshold rule.
    if (isPersonalBest && !prevBest.current) {
      onMilestone?.();
    }
    prevBest.current = isPersonalBest;
  }, [value, isPersonalBest, motionOn, scale, onMilestone]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View style={[containerStyle, style]} testID={id} accessibilityRole="text" accessibilityLabel={`${label}: ${value.toLocaleString()}${delta ? `, plus ${delta}` : ''}${isPersonalBest ? ', new personal best' : ''}`}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
      <Animated.View style={motionOn ? animatedStyle : undefined}>
        <Text variant="headlineMedium" style={styles.tabular}>
          {value.toLocaleString()}
        </Text>
      </Animated.View>
      {delta ? (
        <Text variant="labelMedium" style={{ color: gaming.colors.success }}>
          +{delta.toLocaleString()}
        </Text>
      ) : null}
      {isPersonalBest ? (
        <View style={styles.row}>
          <Icon source="trophy-outline" size={13} color={gaming.colors.rarityLegendary} />
          <Text variant="labelSmall" style={{ color: gaming.colors.rarityLegendary, marginLeft: 3 }}>
            New personal best
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  tabular: { fontVariant: ['tabular-nums'] },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
});
