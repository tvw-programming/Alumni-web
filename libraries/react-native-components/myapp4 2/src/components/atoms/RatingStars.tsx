import React, { forwardRef, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring } from 'react-native-reanimated';

import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { Size, StyleEscapeHatches } from '../primitives';

export interface RatingStarsProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering'> {
  value?: number;
  defaultValue?: number;
  onChange?: (value: number) => void;
  max?: number;
  size?: Size;
  readonly?: boolean;
  allowHalf?: boolean;
  showValue?: boolean;
  accessibilityLabel?: string;
}

interface StarProps {
  index: number;
  filled: 'full' | 'half' | 'empty';
  size: number;
  color: string;
  emptyColor: string;
  readonly: boolean;
  animated: boolean;
  entering: AnimatableProps['entering'];
  onSelect: (index: number, half: boolean) => void;
  allowHalf: boolean;
  testID?: string;
}

const ICONS = { full: 'star', half: 'star-half-full', empty: 'star-outline' } as const;

const Star = React.memo(function Star({
  index,
  filled,
  size,
  color,
  emptyColor,
  readonly,
  animated,
  entering,
  onSelect,
  allowHalf,
  testID,
}: StarProps) {
  const motion = useMotion({ animated });
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const handlePress = useCallback(
    (event: { nativeEvent: { locationX: number } }) => {
      if (readonly) return;
      if (motion.enabled) {
        scale.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 400 }), withSpring(1));
      }
      onSelect(index, allowHalf && event.nativeEvent.locationX < size / 2);
    },
    [allowHalf, index, motion.enabled, onSelect, readonly, scale, size],
  );

  return (
    <Animated.View entering={motion.entering(entering, index)} style={style}>
      <Pressable
        onPress={handlePress}
        disabled={readonly}
        hitSlop={4}
        accessibilityRole="radio"
        accessibilityState={{ selected: filled !== 'empty', disabled: readonly }}
        accessibilityLabel={`${index + 1} star${index ? 's' : ''}`}
        testID={childTestID(testID, `star-${index + 1}`)}
      >
        <Icon source={ICONS[filled]} size={size} color={filled === 'empty' ? emptyColor : color} />
      </Pressable>
    </Animated.View>
  );
});

export const RatingStars = forwardRef<View, RatingStarsProps>(function RatingStars(
  {
    value,
    defaultValue = 0,
    onChange,
    max = 5,
    size = 'md',
    readonly = false,
    allowHalf = false,
    showValue = false,
    animated = true,
    entering = 'scale',
    style,
    containerStyle,
    testID,
    accessibilityLabel,
  },
  ref,
) {
  const theme = useAppTheme();
  const [rating, setRating] = useControllableState<number>({ value, defaultValue, onChange });

  const iconSize = theme.sizing.icon[size] + 4;

  const handleSelect = useCallback(
    (index: number, half: boolean) => setRating(index + (half ? 0.5 : 1)),
    [setRating],
  );

  const states = useMemo(
    () =>
      Array.from({ length: max }, (_, i): 'full' | 'half' | 'empty' => {
        if (rating >= i + 1) return 'full';
        if (allowHalf && rating >= i + 0.5) return 'half';
        return 'empty';
      }),
    [allowHalf, max, rating],
  );

  return (
    <View
      ref={ref}
      style={[styles.row, containerStyle, style]}
      accessibilityRole={readonly ? 'text' : 'radiogroup'}
      accessibilityLabel={accessibilityLabel ?? `Rated ${rating} out of ${max}`}
      testID={testID}
    >
      {states.map((filled, i) => (
        <Star
          key={i}
          index={i}
          filled={filled}
          size={iconSize}
          color={theme.colors.warning}
          emptyColor={theme.colors.outlineVariant}
          readonly={readonly}
          animated={animated}
          entering={entering}
          allowHalf={allowHalf}
          onSelect={handleSelect}
          testID={testID}
        />
      ))}
      {showValue && (
        <Text variant="labelMedium" style={{ marginLeft: theme.spacing.xs, color: theme.colors.onSurfaceVariant }}>
          {rating.toFixed(allowHalf ? 1 : 0)}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
