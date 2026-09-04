import React, { memo, useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useAppTheme } from '@/theme';
import { useMotion } from '@/hooks';
import { childTestID } from '@/utils';

import { useFintechTheme } from '../theme/fintechTokens';

/**
 * The numeric keypad shared by `AmountKeypad` and `PinPad`.
 *
 * Extracted rather than duplicated: both need identical key sizing, haptic-free
 * accessible labels, long-press-to-clear on backspace, and the same press
 * animation. Two copies would drift within a release.
 */

export type KeypadKey =
  | { kind: 'digit'; value: string }
  | { kind: 'decimal'; value: string }
  | { kind: 'backspace' }
  | { kind: 'custom'; value: string; icon?: string; label: string }
  | { kind: 'empty' };

export interface KeypadProps {
  onKeyPress: (key: KeypadKey) => void;
  /** Long-press backspace clears the whole entry. */
  onClear?: () => void;
  /** Locale decimal separator; omit to hide the decimal key. */
  decimalSeparator?: string;
  /** Replaces the bottom-left slot (biometric affordance on PinPad). */
  leadingKey?: KeypadKey;
  disabled?: boolean;
  /** Shuffle digits. Only enable when threat modelling justifies it — it hurts
   *  usability and muscle memory for everyone, including screen-reader users. */
  randomize?: boolean;
  testID?: string;
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

const shuffle = (input: string[]): string[] => {
  const output = [...input];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = output[i] as string;
    const b = output[j] as string;
    output[i] = b;
    output[j] = a;
  }
  return output;
};

interface KeyProps {
  item: KeypadKey;
  height: number;
  disabled: boolean;
  onPress: (key: KeypadKey) => void;
  onLongPress?: () => void;
  testID?: string;
}

const Key = memo(function Key({ item, height, disabled, onPress, onLongPress, testID }: KeyProps) {
  const theme = useAppTheme();
  const motion = useMotion();
  const pressed = useSharedValue(0);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.06 }],
    backgroundColor:
      pressed.value > 0 ? theme.colors.surfaceVariant : 'transparent',
  }));

  const handleIn = useCallback(() => {
    pressed.value = motion.enabled ? withSpring(1, theme.motion.spring.snappy) : 1;
  }, [motion.enabled, pressed, theme.motion.spring.snappy]);

  const handleOut = useCallback(() => {
    pressed.value = motion.enabled ? withTiming(0, { duration: 120 }) : 0;
  }, [motion.enabled, pressed]);

  if (item.kind === 'empty') return <View style={[styles.key, { height }]} />;

  // Every key gets a spoken name — "5" alone reads as ambiguous punctuation
  // in some screen readers.
  const label =
    item.kind === 'digit'
      ? `number ${item.value}`
      : item.kind === 'decimal'
        ? 'decimal separator'
        : item.kind === 'backspace'
          ? 'delete'
          : item.label;

  return (
    <Animated.View style={[styles.keyWrap, { height }, style]}>
      <Pressable
        onPress={() => onPress(item)}
        onLongPress={item.kind === 'backspace' ? onLongPress : undefined}
        onPressIn={handleIn}
        onPressOut={handleOut}
        disabled={disabled}
        style={styles.key}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={item.kind === 'backspace' ? 'Long press to clear everything' : undefined}
        accessibilityState={{ disabled }}
        testID={childTestID(
          testID,
          item.kind === 'digit' || item.kind === 'decimal' ? `key-${item.value}` : `key-${item.kind}`,
        )}
      >
        {item.kind === 'backspace' ? (
          <Icon source="backspace-outline" size={theme.sizing.icon.lg} color={theme.colors.onSurface} />
        ) : item.kind === 'custom' && item.icon ? (
          <Icon source={item.icon} size={theme.sizing.icon.lg} color={theme.colors.primary} />
        ) : (
          <Text
            variant="headlineSmall"
            style={{ color: disabled ? theme.colors.outlineVariant : theme.colors.onSurface }}
          >
            {item.kind === 'custom' ? item.value : item.value}
          </Text>
        )}
      </Pressable>
    </Animated.View>
  );
});

export const Keypad = memo(function Keypad({
  onKeyPress,
  onClear,
  decimalSeparator,
  leadingKey,
  disabled = false,
  randomize = false,
  testID,
}: KeypadProps) {
  const theme = useAppTheme();
  const { layout } = useFintechTheme();

  const keys = useMemo<KeypadKey[]>(() => {
    const digits = randomize ? shuffle(DIGITS) : DIGITS;
    const first = digits.slice(0, 9).map((value) => ({ kind: 'digit' as const, value }));
    const bottomLeft: KeypadKey =
      leadingKey ?? (decimalSeparator ? { kind: 'decimal', value: decimalSeparator } : { kind: 'empty' });
    const zero: KeypadKey = { kind: 'digit', value: randomize ? (digits[9] ?? '0') : '0' };
    return [...first, bottomLeft, zero, { kind: 'backspace' }];
  }, [decimalSeparator, leadingKey, randomize]);

  return (
    <View
      style={[styles.grid, { gap: layout.keypadGap, paddingHorizontal: theme.spacing.sm }]}
      accessibilityRole="none"
      testID={testID}
    >
      {keys.map((item, index) => (
        <Key
          key={`${item.kind}-${index}`}
          item={item}
          height={layout.keypadKeyHeight}
          disabled={disabled}
          onPress={onKeyPress}
          onLongPress={onClear}
          testID={testID}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  keyWrap: { width: '31%', borderRadius: 999, overflow: 'hidden' },
  key: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
});
