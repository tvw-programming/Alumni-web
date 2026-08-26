import React, { forwardRef, useImperativeHandle, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View, type TextStyle } from 'react-native';
import { Button as PaperButton, type ButtonProps as PaperButtonProps } from 'react-native-paper';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useMotion, usePressAnimation, useShake, useThrottledCallback } from '@/hooks';
import { resolveIntent, useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { Size, SlotProps, StateProps, StyleEscapeHatches } from '../primitives';
import type { AnimatableProps } from '@/hooks';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Variant is the public API; Paper's `mode` is an implementation detail. */
const VARIANT_TO_MODE: Record<ButtonVariant, PaperButtonProps['mode']> = {
  primary: 'contained',
  secondary: 'outlined',
  ghost: 'text',
  danger: 'contained',
};

const SIZE_TO_FONT: Record<Size, keyof ReturnType<typeof useAppTheme>['typography']['label']> = {
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

export interface AppButtonProps
  extends StateProps,
    SlotProps,
    StyleEscapeHatches,
    AnimatableProps,
    Omit<
      PaperButtonProps,
      'mode' | 'children' | 'style' | 'loading' | 'disabled' | 'buttonColor' | 'textColor'
    > {
  /** 1. Semantic variant — never a raw color. */
  variant?: ButtonVariant;
  size?: Size;
  /** Stretch to the parent's width. */
  fullWidth?: boolean;
  /** Where a Paper icon renders relative to the label. */
  iconPosition?: 'left' | 'right';
  /** Swallow repeat taps inside this window. Set it on anything that costs money. */
  debounceMs?: number;
}

export interface AppButtonHandle {
  /** Shake the button — call it when a submit fails validation. */
  shake: () => void;
}

/**
 * The library's flagship control.
 *
 * Motion: press → spring scale to 0.97, loading → spinner cross-fades over a
 * label that stays mounted (which is what actually preserves the width), and an
 * imperative error shake.
 */
export const AppButton = forwardRef<AppButtonHandle, AppButtonProps>(function AppButton(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    fullWidth = false,
    iconPosition = 'left',
    debounceMs = 0,
    left,
    right,
    children,
    animated = true,
    pressAnimation = 'scale',
    animationDuration,
    entering = false,
    index = 0,
    style,
    containerStyle,
    testID,
    onPress,
    contentStyle,
    labelStyle,
    accessibilityLabel,
    ...rest
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated, animationDuration });
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: pressAnimation,
    animated,
    disabled: disabled || loading,
    scaleTo: 0.97,
  });
  const { style: shakeStyle, shake } = useShake(animated);

  useImperativeHandle(ref, () => ({ shake }), [shake]);

  const isInert = disabled || loading;
  const handlePress = useThrottledCallback(onPress, debounceMs);

  const { buttonColor, textColor } = useMemo(() => {
    const intent = resolveIntent(theme, variant === 'danger' ? 'error' : 'primary');
    if (variant === 'primary' || variant === 'danger') {
      return { buttonColor: intent.main, textColor: intent.on };
    }
    return { buttonColor: undefined, textColor: theme.colors.primary };
  }, [theme, variant]);

  const resolvedContentStyle = useMemo(
    () => [
      {
        height: theme.sizing.control[size],
        flexDirection: iconPosition === 'right' ? ('row-reverse' as const) : ('row' as const),
        paddingHorizontal: theme.spacing[size === 'sm' ? 'sm' : 'md'],
      },
      contentStyle,
    ],
    [contentStyle, iconPosition, size, theme.sizing.control, theme.spacing],
  );

  const resolvedLabelStyle = useMemo<TextStyle[]>(
    () => [
      {
        fontSize: theme.typography.label[SIZE_TO_FONT[size]],
        // Keeping the label mounted (merely transparent) is what prevents the
        // width from collapsing when `loading` flips.
        opacity: loading ? 0 : 1,
      },
      labelStyle as TextStyle,
    ],
    [labelStyle, loading, size, theme.typography.label],
  );

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      style={[fullWidth && styles.fullWidth, containerStyle, animatedStyle, shakeStyle]}
    >
      <PaperButton
        {...rest}
        mode={VARIANT_TO_MODE[variant]}
        onPress={handlePress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={isInert}
        buttonColor={buttonColor}
        textColor={textColor}
        contentStyle={resolvedContentStyle}
        labelStyle={resolvedLabelStyle}
        style={[{ borderRadius: theme.radii.pill }, style]}
        testID={testID}
        accessibilityLabel={accessibilityLabel ?? (typeof children === 'string' ? children : undefined)}
        accessibilityRole="button"
        accessibilityState={{ disabled: isInert, busy: loading }}
      >
        {children}
      </PaperButton>

      {(left || right) && (
        // Both cells always render so a lone `right` slot stays on the right.
        <View style={styles.slots} pointerEvents="box-none">
          <View>{left}</View>
          <View>{right}</View>
        </View>
      )}

      {loading && (
        <Animated.View
          entering={motion.enabled ? FadeIn.duration(motion.ms('fast')) : undefined}
          exiting={motion.enabled ? FadeOut.duration(motion.ms('fast')) : undefined}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
          testID={childTestID(testID, 'loading')}
        >
          <View style={styles.spinner}>
            <ActivityIndicator size="small" color={textColor} />
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  fullWidth: { alignSelf: 'stretch' },
  spinner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  slots: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
