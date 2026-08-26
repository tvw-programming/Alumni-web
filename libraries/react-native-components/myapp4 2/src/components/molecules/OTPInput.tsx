import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput as RNTextInput, View } from 'react-native';
import { HelperText, Text } from 'react-native-paper';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { useControllableState, useMotion, useShake, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { StateProps, StyleEscapeHatches } from '../primitives';

export interface OTPInputProps extends StateProps, StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  length?: number;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
  /** Render dots instead of digits. */
  secure?: boolean;
  /** Fire `onComplete` as soon as the last cell fills. */
  autoSubmit?: boolean;
  onComplete?: (value: string) => void;
  errorText?: string;
  /** Seconds until "Resend" becomes available. Pass 0 to hide the row. */
  resendIn?: number;
  onResend?: () => void;
}

export interface OTPInputHandle {
  focus: () => void;
  clear: () => void;
  shake: () => void;
}

interface CellProps {
  char: string;
  focused: boolean;
  error: boolean;
  secure: boolean;
  animated: boolean;
  testID?: string;
  index: number;
}

const Cell = React.memo(function Cell({ char, focused, error, secure, animated, testID, index }: CellProps) {
  const theme = useAppTheme();
  const motion = useMotion({ animated });
  const focus = useSharedValue(0);
  const pop = useSharedValue(char ? 1 : 0);

  useEffect(() => {
    focus.value = motion.enabled ? withTiming(focused ? 1 : 0, motion.timing('fast')) : focused ? 1 : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, motion.enabled]);

  useEffect(() => {
    const target = char ? 1 : 0;
    pop.value = motion.enabled ? withSpring(target, theme.motion.spring.bouncy) : target;
  }, [char, motion.enabled, pop, theme.motion.spring.bouncy]);

  const style = useAnimatedStyle(() => ({
    borderWidth: 1 + focus.value,
    transform: [{ scale: 1 + focus.value * 0.04 + pop.value * 0.03 }],
  }));

  const borderColor = error ? theme.colors.error : focused ? theme.colors.primary : theme.colors.outlineVariant;

  return (
    <Animated.View
      style={[
        styles.cell,
        style,
        {
          width: theme.sizing.control.md,
          height: theme.sizing.control.lg,
          borderRadius: theme.radii.md,
          borderColor,
          backgroundColor: theme.colors.surface,
        },
      ]}
      testID={childTestID(testID, `cell-${index}`)}
    >
      <Text variant="titleLarge">{secure && char ? '•' : char}</Text>
    </Animated.View>
  );
});

export const OTPInput = forwardRef<OTPInputHandle, OTPInputProps>(function OTPInput(
  {
    length = 6,
    value,
    defaultValue = '',
    onChange,
    autoFocus = false,
    secure = false,
    autoSubmit = true,
    onComplete,
    error = false,
    errorText,
    disabled = false,
    resendIn = 0,
    onResend,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const inputRef = useRef<RNTextInput>(null);
  const [focused, setFocused] = useState(false);
  const { style: shakeStyle, shake } = useShake(animated);
  const [code, setCode] = useControllableState<string>({ value, defaultValue, onChange });
  const [secondsLeft, setSecondsLeft] = useState(resendIn);

  useImperativeHandle(
    ref,
    () => ({ focus: () => inputRef.current?.focus(), clear: () => setCode(''), shake }),
    [setCode, shake],
  );

  // Shake on the *transition* into an error, not on every render while invalid.
  const wasError = useRef(error);
  useEffect(() => {
    if (error && !wasError.current) shake();
    wasError.current = error;
  }, [error, shake]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => setSecondsLeft((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const handleChange = useCallback(
    (next: string) => {
      const digits = next.replace(/\D/g, '').slice(0, length);
      setCode(digits);
      if (autoSubmit && digits.length === length) {
        inputRef.current?.blur();
        onComplete?.(digits);
      }
    },
    [autoSubmit, length, onComplete, setCode],
  );

  const handleResend = useCallback(() => {
    setSecondsLeft(resendIn);
    setCode('');
    onResend?.();
    inputRef.current?.focus();
  }, [onResend, resendIn, setCode]);

  return (
    <View style={containerStyle} testID={testID}>
      <Pressable
        onPress={() => inputRef.current?.focus()}
        disabled={disabled}
        accessibilityRole="none"
        accessibilityLabel={`Enter the ${length} digit code`}
        accessibilityState={{ disabled }}
      >
        <Animated.View style={[styles.row, { gap: theme.spacing.sm }, shakeStyle, style]}>
          {Array.from({ length }).map((_, i) => (
            <Cell
              key={i}
              index={i}
              char={code[i] ?? ''}
              focused={focused && (i === code.length || (i === length - 1 && code.length === length))}
              error={error}
              secure={secure}
              animated={animated}
              testID={testID}
            />
          ))}
        </Animated.View>
      </Pressable>

      {/* One real input behind the cells: OS autofill and paste keep working. */}
      <RNTextInput
        ref={inputRef}
        value={code}
        onChangeText={handleChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={length}
        caretHidden
        style={styles.hidden}
        testID={childTestID(testID, 'input')}
      />

      <View style={styles.footer}>
        {error && errorText ? (
          <HelperText type="error" visible padding="none" testID={childTestID(testID, 'error')}>
            {errorText}
          </HelperText>
        ) : (
          <View />
        )}
        {resendIn > 0 && (
          <Pressable
            onPress={handleResend}
            disabled={secondsLeft > 0}
            accessibilityRole="button"
            accessibilityLabel="Resend code"
            accessibilityState={{ disabled: secondsLeft > 0 }}
            testID={childTestID(testID, 'resend')}
          >
            <Text
              variant="labelMedium"
              style={{ color: secondsLeft > 0 ? theme.colors.onSurfaceVariant : theme.colors.primary }}
            >
              {secondsLeft > 0 ? `Resend in ${secondsLeft}s` : 'Resend code'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center' },
  cell: { alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0, height: 1, width: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 24 },
});
