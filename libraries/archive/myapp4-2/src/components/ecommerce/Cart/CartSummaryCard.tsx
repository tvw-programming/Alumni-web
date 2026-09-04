import React, { forwardRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { formatMoney, type Money } from '@ui/primitives/money';
import { MoneyRow } from '@ui/molecules/MoneyRow';

// Promoted to the base library once on-demand pricing needed the same row.
export { MoneyRow, type MoneyRowProps } from '@ui/molecules/MoneyRow';
import { useMotion } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { CartTotals } from '../types/domain';

export type SummaryVariant = 'mini' | 'full' | 'checkout' | 'collapsible';

export interface CartSummaryCardProps extends StyleEscapeHatches {
  totals?: CartTotals;
  variant?: SummaryVariant;
  locale?: string;
  loading?: boolean;
  itemCount?: number;
  /** CTA. Omit on the checkout page where payment is the CTA. */
  onCheckout?: () => void;
  checkoutLabel?: string;
  checkoutDisabled?: boolean;
  checkoutDisabledReason?: string;
  /** Slot for CouponInput / offers. */
  promoSlot?: React.ReactNode;
  /** Slot for the free-delivery threshold nudge. */
  footerSlot?: React.ReactNode;
}

/**
 * Cart totals with mandatory charges always visible.
 *
 * Progressive disclosure applies to *breakdowns*, never to the payable total or
 * to a mandatory fee. Hiding a delivery or service fee until the payment step
 * is the single most-cited cause of checkout abandonment.
 */
export const CartSummaryCard = forwardRef<View, CartSummaryCardProps>(function CartSummaryCard(
  {
    totals,
    variant = 'full',
    locale = 'en-IN',
    loading = false,
    itemCount,
    onCheckout,
    checkoutLabel = 'Proceed to checkout',
    checkoutDisabled = false,
    checkoutDisabledReason,
    promoSlot,
    footerSlot,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion();
  const [expanded, setExpanded] = useState(variant !== 'collapsible');

  if (loading || !totals) {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={childTestID(testID, 'loading')}>
        <SkeletonLoader shape="text" lines={4} />
        <SkeletonLoader shape="text" lines={1} height={44} containerStyle={{ marginTop: 16 }} />
      </AppCard>
    );
  }

  const showDetail = expanded || variant === 'mini';

  return (
    <AppCard
      ref={ref}
      variant={variant === 'mini' ? 'filled' : 'outlined'}
      title={variant === 'mini' ? undefined : 'Order summary'}
      containerStyle={containerStyle}
      style={style}
      testID={testID}
    >
      {variant === 'collapsible' ? (
        <TouchableRipple
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          accessibilityLabel={expanded ? 'Hide price details' : 'Show price details'}
          testID={childTestID(testID, 'toggle')}
        >
          <View style={[styles.row, { paddingVertical: theme.spacing.xs }]}>
            <Text variant="labelLarge" style={styles.flex}>
              {expanded ? 'Hide details' : 'Show details'}
            </Text>
            <Icon source={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.onSurfaceVariant} />
          </View>
        </TouchableRipple>
      ) : null}

      {promoSlot ? <View style={{ marginBottom: theme.spacing.sm }}>{promoSlot}</View> : null}

      <Animated.View layout={motion.layout}>
        {showDetail ? (
          <>
            <MoneyRow
              label={itemCount != null ? `Subtotal (${itemCount} item${itemCount === 1 ? '' : 's'})` : 'Subtotal'}
              value={totals.subtotal}
              locale={locale}
              testID={childTestID(testID, 'subtotal')}
            />

            {totals.discounts && totals.discounts.minorUnits > 0 ? (
              <MoneyRow label="Discounts" value={totals.discounts} emphasis="savings" locale={locale} testID={childTestID(testID, 'discounts')} />
            ) : null}

            {/* Mandatory charges are never behind the disclosure. */}
            <MoneyRow
              label="Delivery"
              value={totals.shipping && totals.shipping.minorUnits > 0 ? totals.shipping : undefined}
              placeholder={totals.shipping ? 'FREE' : 'Calculated at checkout'}
              locale={locale}
              testID={childTestID(testID, 'shipping')}
            />

            {totals.serviceFee ? (
              <MoneyRow label="Service fee" value={totals.serviceFee} locale={locale} testID={childTestID(testID, 'service-fee')} />
            ) : null}

            {totals.tax ? (
              <MoneyRow
                label="Tax"
                value={totals.tax}
                hint={totals.estimatedNote}
                locale={locale}
                testID={childTestID(testID, 'tax')}
              />
            ) : null}

            {totals.tip ? <MoneyRow label="Tip" value={totals.tip} locale={locale} /> : null}

            {totals.credits && totals.credits.minorUnits > 0 ? (
              <MoneyRow label="Wallet credit" value={totals.credits} emphasis="savings" locale={locale} />
            ) : null}

            <Divider style={{ marginVertical: theme.spacing.sm }} />
          </>
        ) : null}

        <MoneyRow label="Total" value={totals.total} emphasis="total" locale={locale} testID={childTestID(testID, 'total')} />

        {totals.savings && totals.savings.minorUnits > 0 ? (
          <View
            style={[
              styles.savings,
              { backgroundColor: shop.colors.savingsContainer, borderRadius: theme.radii.sm, padding: theme.spacing.xs, marginTop: theme.spacing.xs },
            ]}
          >
            <Icon source="tag-outline" size={14} color={shop.colors.savings} />
            <Text variant="labelSmall" style={{ color: shop.colors.savings, marginLeft: 4 }}>
              You save {formatMoney(totals.savings, { locale })} on this order
            </Text>
          </View>
        ) : null}
      </Animated.View>

      {footerSlot ? <View style={{ marginTop: theme.spacing.sm }}>{footerSlot}</View> : null}

      {onCheckout ? (
        <>
          <AppButton
            variant="primary"
            size="lg"
            fullWidth
            disabled={checkoutDisabled}
            debounceMs={1000}
            onPress={onCheckout}
            containerStyle={{ marginTop: theme.spacing.md }}
            testID={childTestID(testID, 'checkout')}
          >
            {checkoutLabel}
          </AppButton>
          {checkoutDisabled && checkoutDisabledReason ? (
            <Text variant="labelSmall" style={{ color: shop.colors.lowStock, marginTop: theme.spacing.xs }}>
              {checkoutDisabledReason}
            </Text>
          ) : null}
        </>
      ) : null}
    </AppCard>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  savings: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
