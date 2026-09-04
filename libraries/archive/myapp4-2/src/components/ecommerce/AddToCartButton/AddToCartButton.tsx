import React, { forwardRef, useCallback, useEffect, useRef } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton, type AppButtonHandle } from '@ui/atoms/AppButton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { Size, StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { QuantityStepper } from '../QuantityStepper/QuantityStepper';
import { useShopTheme } from '../theme/ecommerceTokens';
import type { AddToCartState, QuantityConfig } from '../types/domain';

export type AddToCartVariant = 'full' | 'compact' | 'floating' | 'withStepper' | 'split';

interface StateConfig {
  label: string;
  variant: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: string;
  disabled: boolean;
  loading: boolean;
}

/** One place that decides what each state looks like and says. */
const STATE_CONFIG: Record<AddToCartState, StateConfig> = {
  idle: { label: 'Add to cart', variant: 'primary', icon: 'cart-plus', disabled: false, loading: false },
  loading: { label: 'Adding…', variant: 'primary', disabled: true, loading: true },
  added: { label: 'Added', variant: 'secondary', icon: 'check', disabled: false, loading: false },
  chooseOptions: { label: 'Choose options', variant: 'primary', icon: 'tune-variant', disabled: false, loading: false },
  outOfStock: { label: 'Notify me', variant: 'secondary', icon: 'bell-outline', disabled: false, loading: false },
  error: { label: 'Try again', variant: 'danger', icon: 'refresh', disabled: false, loading: false },
  disabled: { label: 'Unavailable', variant: 'secondary', disabled: true, loading: false },
};

export interface AddToCartButtonProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  state: AddToCartState;
  productId: string;
  selectedVariantId?: string;
  /** Present in the `added` state so the user can adjust without re-navigating. */
  quantity?: QuantityConfig;
  variant?: AddToCartVariant;
  size?: Size;
  label?: string;
  /** Item name, used in accessible labels and announcements. */
  itemLabel?: string;
  errorMessage?: string;
  fullWidth?: boolean;
  onAdd: (productId: string, variantId?: string) => void;
  onQuantityChange?: (next: number) => void;
  onViewCart?: () => void;
  /** Focus the variant selector — never silently add a default size. */
  onChooseOptions?: () => void;
  onNotifyMe?: () => void;
  onRetry?: () => void;
  onBuyNow?: () => void;
}

/**
 * The cart CTA as an explicit state machine.
 *
 * Two things it deliberately does not do: it never infers success from the tap
 * (the caller supplies `state` from the server's answer), and it never picks a
 * variant for the user — `chooseOptions` routes to the selector instead.
 */
export const AddToCartButton = forwardRef<View, AddToCartButtonProps>(function AddToCartButton(
  {
    state,
    productId,
    selectedVariantId,
    quantity,
    variant = 'full',
    size = 'md',
    label,
    itemLabel = 'item',
    errorMessage,
    fullWidth = true,
    onAdd,
    onQuantityChange,
    onViewCart,
    onChooseOptions,
    onNotifyMe,
    onRetry,
    onBuyNow,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const buttonRef = useRef<AppButtonHandle>(null);
  const previousState = useRef(state);

  const config = STATE_CONFIG[state];

  /**
   * Announce the outcome. A toast that vanishes before it is read is not
   * feedback — the state change itself has to be perceivable.
   */
  useEffect(() => {
    if (previousState.current === state) return;
    if (state === 'added') AccessibilityInfo.announceForAccessibility(`${itemLabel} added to cart`);
    if (state === 'outOfStock') AccessibilityInfo.announceForAccessibility(`${itemLabel} is sold out`);
    if (state === 'error') {
      AccessibilityInfo.announceForAccessibility(errorMessage ?? 'Could not add to cart');
      buttonRef.current?.shake();
    }
    previousState.current = state;
  }, [errorMessage, itemLabel, state]);

  const handlePress = useCallback(() => {
    switch (state) {
      case 'chooseOptions':
        onChooseOptions?.();
        return;
      case 'outOfStock':
        onNotifyMe?.();
        return;
      case 'error':
        (onRetry ?? (() => onAdd(productId, selectedVariantId)))();
        return;
      case 'added':
        onViewCart?.();
        return;
      default:
        onAdd(productId, selectedVariantId);
    }
  }, [onAdd, onChooseOptions, onNotifyMe, onRetry, onViewCart, productId, selectedVariantId, state]);

  // Once in the cart, the stepper replaces the CTA — the Blinkit/Instacart pattern.
  if (variant === 'withStepper' && state === 'added' && quantity) {
    return (
      <View ref={ref} style={[styles.row, { gap: theme.spacing.sm }, containerStyle]} testID={testID}>
        <QuantityStepper
          {...quantity}
          value={quantity.value}
          onChange={onQuantityChange}
          itemLabel={itemLabel}
          size={size}
          variant="cart"
          testID={childTestID(testID, 'stepper')}
        />
        {onViewCart ? (
          <AppButton variant="ghost" size="sm" onPress={onViewCart} testID={childTestID(testID, 'view-cart')}>
            View cart
          </AppButton>
        ) : null}
      </View>
    );
  }

  const button = (
    <AppButton
      ref={buttonRef}
      variant={config.variant}
      size={size}
      icon={config.icon}
      loading={config.loading}
      disabled={config.disabled}
      fullWidth={fullWidth}
      // Duplicate-tap prevention on a cart mutation.
      debounceMs={800}
      animated={animated}
      onPress={handlePress}
      accessibilityLabel={`${label ?? config.label}, ${itemLabel}`}
      style={style}
      testID={childTestID(testID, 'button')}
    >
      {label ?? config.label}
    </AppButton>
  );

  return (
    <View ref={ref} style={containerStyle} testID={testID}>
      {variant === 'split' && onBuyNow ? (
        <View style={[styles.row, { gap: theme.spacing.sm }]}>
          <View style={styles.flex}>{button}</View>
          <View style={styles.flex}>
            <AppButton
              variant="secondary"
              size={size}
              fullWidth
              debounceMs={800}
              disabled={state === 'outOfStock' || state === 'disabled'}
              onPress={onBuyNow}
              testID={childTestID(testID, 'buy-now')}
            >
              Buy now
            </AppButton>
          </View>
        </View>
      ) : (
        button
      )}

      {state === 'error' && errorMessage ? (
        <Text
          variant="labelSmall"
          style={{ color: shop.colors.priceDeal, marginTop: theme.spacing.xs }}
          testID={childTestID(testID, 'error')}
        >
          {errorMessage}
        </Text>
      ) : null}

      {state === 'added' && onViewCart && variant !== 'withStepper' ? (
        <Text
          variant="labelSmall"
          onPress={onViewCart}
          accessibilityRole="button"
          style={{ color: theme.colors.primary, marginTop: theme.spacing.xs }}
          testID={childTestID(testID, 'view-cart-link')}
        >
          View cart
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
