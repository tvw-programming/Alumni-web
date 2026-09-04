import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Surface, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { useMotion, usePressAnimation, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import type { SpacingToken } from '@/theme';
import type { StyleEscapeHatches } from '../primitives';

export type CardVariant = 'elevated' | 'outlined' | 'filled' | 'media' | 'horizontal';

export interface AppCardProps extends StyleEscapeHatches, AnimatableProps {
  variant?: CardVariant;
  title?: string;
  subtitle?: string;
  /** Slots — anything richer than title/subtitle goes here. */
  header?: React.ReactNode;
  media?: React.ReactNode;
  footer?: React.ReactNode;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  /** Padding is opt-in: media-edge-to-edge cards are the common case. */
  padded?: boolean;
  contentPadding?: SpacingToken;
  disabled?: boolean;
  accessibilityLabel?: string;
}

/**
 * Surface + slots. Deliberately not Paper's `Card`, because `Card` bakes in a
 * padding and header structure we need to be able to opt out of.
 */
export const AppCard = forwardRef<View, AppCardProps>(function AppCard(
  {
    variant = 'elevated',
    title,
    subtitle,
    header,
    media,
    footer,
    actions,
    children,
    onPress,
    onLongPress,
    padded = true,
    contentPadding = 'md',
    disabled = false,
    animated = true,
    entering = false,
    pressAnimation = 'scale',
    animationDuration,
    index = 0,
    style,
    containerStyle,
    testID,
    accessibilityLabel,
  },
  ref,
) {
  const theme = useAppTheme();
  const motion = useMotion({ animated, animationDuration });
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: onPress ? pressAnimation : 'none',
    animated,
    disabled,
    scaleTo: 0.98,
  });

  const surfaceStyle = useMemo<ViewStyle>(() => {
    const base: ViewStyle = { borderRadius: theme.radii.lg, overflow: 'hidden' };
    switch (variant) {
      case 'outlined':
        return {
          ...base,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.outlineVariant,
          backgroundColor: theme.colors.surface,
        };
      case 'filled':
        return { ...base, backgroundColor: theme.colors.surfaceVariant };
      default:
        return base;
    }
  }, [theme, variant]);

  const horizontal = variant === 'horizontal';
  const pad = padded ? theme.spacing[contentPadding] : 0;

  const body = (
    <View style={horizontal ? styles.horizontal : undefined}>
      {media}
      <View style={[horizontal && styles.flex, { padding: pad }]}>
        {header ?? (
          (title || subtitle) && (
            <View style={{ marginBottom: children ? theme.spacing.xs : 0 }}>
              {title ? (
                <Text variant="titleMedium" numberOfLines={2} testID={childTestID(testID, 'title')}>
                  {title}
                </Text>
              ) : null}
              {subtitle ? (
                <Text
                  variant="bodySmall"
                  numberOfLines={2}
                  style={{ color: theme.colors.onSurfaceVariant }}
                  testID={childTestID(testID, 'subtitle')}
                >
                  {subtitle}
                </Text>
              ) : null}
            </View>
          )
        )}
        {children}
        {footer}
        {actions ? (
          <View style={[styles.actions, { marginTop: theme.spacing.sm, gap: theme.spacing.sm }]}>
            {actions}
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[containerStyle, animatedStyle]}
    >
      <Surface
        elevation={variant === 'elevated' || variant === 'media' ? 1 : 0}
        style={[surfaceStyle, style]}
        testID={testID}
      >
        {onPress || onLongPress ? (
          <TouchableRipple
            onPress={onPress}
            onLongPress={onLongPress}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
            disabled={disabled}
            accessibilityRole="button"
            accessibilityLabel={accessibilityLabel ?? title}
            accessibilityState={{ disabled }}
            borderless
          >
            {body}
          </TouchableRipple>
        ) : (
          body
        )}
      </Surface>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  horizontal: { flexDirection: 'row', alignItems: 'stretch' },
  flex: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
});
