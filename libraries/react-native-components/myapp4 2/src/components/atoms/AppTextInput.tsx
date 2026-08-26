import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type TextInput as RNTextInput } from 'react-native';
import { HelperText, TextInput as PaperTextInput, type TextInputProps } from 'react-native-paper';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { useControllableState, useMotion, useShake, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { MASKS, childTestID, type MaskName } from '@/utils';

import type { Size, SlotProps, StateProps, StyleEscapeHatches } from '../primitives';

export interface AppTextInputProps
  extends StateProps,
    Pick<SlotProps, 'left' | 'right'>,
    StyleEscapeHatches,
    Pick<AnimatableProps, 'animated' | 'animationDuration'>,
    Omit<TextInputProps, 'error' | 'style' | 'value' | 'left' | 'right' | 'theme'> {
  variant?: 'outlined' | 'flat';
  size?: Size;
  value?: string;
  defaultValue?: string;
  /** Presentation-only formatting. `onChangeText` always receives the raw value. */
  mask?: MaskName;
  clearable?: boolean;
  showCounter?: boolean;
  /** Renders the eye toggle and manages `secureTextEntry` itself. */
  secureToggle?: boolean;
  helperText?: string;
  errorText?: string;
}

export interface AppTextInputHandle {
  focus: () => void;
  blur: () => void;
  clear: () => void;
  shake: () => void;
}

/** Height reserved for the helper row so validation never reflows the form. */
const HELPER_ROW_HEIGHT = 22;

export const AppTextInput = forwardRef<AppTextInputHandle, AppTextInputProps>(function AppTextInput(
  {
    variant = 'outlined',
    size = 'md',
    value,
    defaultValue = '',
    mask = 'none',
    clearable = false,
    showCounter = false,
    secureToggle = false,
    helperText,
    errorText,
    error = false,
    disabled = false,
    loading = false,
    left,
    right,
    animated = true,
    animationDuration,
    maxLength,
    onChangeText,
    style,
    containerStyle,
    testID,
    label,
    ...rest
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated, animationDuration });
  const { style: shakeStyle, shake } = useShake(animated);
  const inputRef = useRef<RNTextInput>(null);
  const [secureHidden, setSecureHidden] = useState(secureToggle);

  const [raw, setRaw] = useControllableState<string>({
    value,
    defaultValue,
    onChange: onChangeText,
  });

  useImperativeHandle(
    ref,
    () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      clear: () => setRaw(''),
      shake,
    }),
    [setRaw, shake],
  );

  const maskSpec = MASKS[mask];
  const display = useMemo(() => maskSpec.format(raw), [maskSpec, raw]);

  const handleChangeText = useCallback(
    (next: string) => setRaw(maskSpec.unformat(next)),
    [maskSpec, setRaw],
  );

  const message = error ? errorText ?? helperText : helperText;
  const counter = showCounter && maxLength ? `${raw.length}/${maxLength}` : undefined;

  const trailing = useMemo(() => {
    if (right) return right;
    if (secureToggle) {
      return (
        <PaperTextInput.Icon
          icon={secureHidden ? 'eye-off' : 'eye'}
          onPress={() => setSecureHidden((prev) => !prev)}
          accessibilityLabel={secureHidden ? 'Show text' : 'Hide text'}
          testID={childTestID(testID, 'secure-toggle')}
        />
      );
    }
    if (clearable && raw.length > 0 && !disabled) {
      return (
        <PaperTextInput.Icon
          icon="close-circle"
          onPress={() => setRaw('')}
          accessibilityLabel="Clear text"
          testID={childTestID(testID, 'clear')}
        />
      );
    }
    return undefined;
  }, [clearable, disabled, raw.length, right, secureHidden, secureToggle, setRaw, testID]);

  return (
    <Animated.View style={[containerStyle, shakeStyle]} layout={motion.layout}>
      <PaperTextInput
        {...rest}
        ref={inputRef}
        label={label}
        mode={variant}
        value={display}
        onChangeText={handleChangeText}
        error={error}
        disabled={disabled || loading}
        maxLength={maskSpec.maxLength ?? maxLength}
        keyboardType={rest.keyboardType ?? maskSpec.keyboardType}
        secureTextEntry={secureToggle ? secureHidden : rest.secureTextEntry}
        left={left}
        right={trailing}
        dense={size === 'sm'}
        style={[{ fontSize: theme.typography.body[size] }, style]}
        testID={childTestID(testID, 'input')}
        accessibilityLabel={rest.accessibilityLabel ?? (typeof label === 'string' ? label : undefined)}
        accessibilityState={{ disabled: disabled || loading }}
      />

      {/* Fixed-height row: helper/error text appears without moving anything. */}
      <View style={[styles.helperRow, { minHeight: HELPER_ROW_HEIGHT }]} pointerEvents="none">
        {message ? (
          <Animated.View
            entering={motion.enabled ? FadeInDown.duration(motion.ms('fast')) : undefined}
            exiting={motion.enabled ? FadeOut.duration(motion.ms('fast')) : undefined}
            style={styles.helperFill}
          >
            <HelperText
              type={error ? 'error' : 'info'}
              visible
              padding="none"
              testID={childTestID(testID, error ? 'error' : 'helper')}
            >
              {message}
            </HelperText>
          </Animated.View>
        ) : null}
        {counter ? (
          <HelperText type="info" visible padding="none" testID={childTestID(testID, 'counter')}>
            {counter}
          </HelperText>
        ) : null}
      </View>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  helperRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  helperFill: { flex: 1 },
});
