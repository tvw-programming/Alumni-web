import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { formatMoney, formatMoneyForA11y, type Money } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { Size, StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { PriceModel } from '../types/domain';

export type PriceEmphasis = 'default' | 'deal' | 'member' | 'muted';
export type PriceLayout = 'inline' | 'stacked';

export interface PriceTagProps extends StyleEscapeHatches {
  price: PriceModel;
  size?: Size;
  emphasis?: PriceEmphasis;
  layout?: PriceLayout;
  showDiscount?: boolean;
  /** Render the "₹50 per kg" line when the model carries one. */
  showUnitPrice?: boolean;
  locale?: string;
  /** Renders "Price unavailable" instead of a zero. */
  unavailable?: boolean;
}

const SIZE_TO_VARIANT = {
  sm: { current: 'titleSmall', compare: 'labelSmall', discount: 'labelSmall' },
  md: { current: 'titleMedium', compare: 'bodySmall', discount: 'labelSmall' },
  lg: { current: 'headlineSmall', compare: 'bodyMedium', discount: 'labelMedium' },
} as const;

/**
 * Price hierarchy in one place.
 *
 * Two rules worth stating: the discount percentage is NEVER recomputed here —
 * it comes from the pricing service so the number the user sees is the number
 * checkout will use — and the whole tag exposes a single spoken sentence rather
 * than three disconnected numbers.
 */
export const PriceTag = forwardRef<View, PriceTagProps>(function PriceTag(
  {
    price,
    size = 'md',
    emphasis = 'default',
    layout = 'inline',
    showDiscount = true,
    showUnitPrice = true,
    locale = 'en-IN',
    unavailable = false,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const variants = SIZE_TO_VARIANT[size];

  const currentColor =
    emphasis === 'deal'
      ? shop.colors.priceDeal
      : emphasis === 'muted'
        ? shop.colors.priceCompare
        : shop.colors.priceCurrent;

  /**
   * The comparison is only meaningful when the reference price is genuinely
   * higher. An MRP equal to (or below) the selling price is a data bug, and
   * rendering "was ₹999, now ₹999" is worse than rendering nothing.
   */
  const showCompare = useMemo(() => {
    if (!price.compareAtPrice) return false;
    if (price.compareAtPrice.currency !== price.sellingPrice.currency) return false;
    return price.compareAtPrice.minorUnits > price.sellingPrice.minorUnits;
  }, [price]);

  /** One coherent sentence: "Sale price ₹1,499, was ₹2,499, 40% off." */
  const a11yLabel = useMemo(() => {
    if (unavailable) return 'Price unavailable';
    const parts = [
      `${price.isFromPrice ? 'From ' : ''}${formatMoneyForA11y(price.sellingPrice, locale)}`,
    ];
    if (showCompare && price.compareAtPrice) {
      parts.push(`original price ${formatMoneyForA11y(price.compareAtPrice, locale)}`);
    }
    if (showDiscount && price.discount) parts.push(price.discount.label);
    if (price.qualifiers?.length) parts.push(price.qualifiers.join(', '));
    if (price.taxMode === 'excluded') parts.push('excluding tax');
    return parts.join(', ');
  }, [locale, price, showCompare, showDiscount, unavailable]);

  if (unavailable) {
    return (
      <View ref={ref} style={containerStyle} testID={testID}>
        <Text variant={variants.current} style={{ color: theme.colors.onSurfaceVariant }}>
          Price unavailable
        </Text>
      </View>
    );
  }

  return (
    <View
      ref={ref}
      accessible
      accessibilityRole="text"
      accessibilityLabel={a11yLabel}
      style={[layout === 'inline' ? styles.inline : styles.stacked, containerStyle, style]}
      testID={testID}
    >
      <Text
        variant={variants.current}
        style={[styles.tabular, { color: currentColor }]}
        accessibilityElementsHidden
        testID={childTestID(testID, 'current')}
      >
        {price.isFromPrice ? 'From ' : ''}
        {formatMoney(price.sellingPrice, { locale })}
      </Text>

      {showCompare && price.compareAtPrice ? (
        <Text
          variant={variants.compare}
          style={[styles.tabular, styles.strike, { color: shop.colors.priceCompare }]}
          accessibilityElementsHidden
          testID={childTestID(testID, 'compare')}
        >
          {formatMoney(price.compareAtPrice, { locale })}
        </Text>
      ) : null}

      {showDiscount && price.discount ? (
        // Discount is a labelled chip, not a bare coloured number.
        <View
          style={[
            styles.discount,
            {
              backgroundColor: price.discount.conditional ? shop.colors.savingsContainer : shop.colors.discountBadge,
              borderRadius: theme.radii.sm,
              paddingHorizontal: theme.spacing.xs,
            },
          ]}
        >
          <Text
            variant={variants.discount}
            style={{ color: price.discount.conditional ? shop.colors.savings : shop.colors.onDiscountBadge }}
            accessibilityElementsHidden
            testID={childTestID(testID, 'discount')}
          >
            {price.discount.label}
          </Text>
        </View>
      ) : null}

      {showUnitPrice && price.unitPrice ? (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant, width: layout === 'stacked' ? '100%' : undefined }}
          accessibilityElementsHidden
        >
          {formatMoney(price.unitPrice, { locale })}
          {price.unitLabel ? ` per ${price.unitLabel}` : ''}
        </Text>
      ) : null}

      {price.qualifiers?.length ? (
        <Text
          variant="labelSmall"
          style={{ color: shop.colors.savings, width: layout === 'stacked' ? '100%' : undefined }}
          accessibilityElementsHidden
        >
          {price.qualifiers.join(' · ')}
        </Text>
      ) : null}

      {price.taxMode === 'excluded' ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} accessibilityElementsHidden>
          + tax
        </Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 6 },
  stacked: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', gap: 4 },
  // Tabular numerals stop the price shifting as digits change.
  tabular: { fontVariant: ['tabular-nums'] },
  strike: { textDecorationLine: 'line-through' },
  discount: { paddingVertical: 1 },
});
