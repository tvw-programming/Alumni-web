import React, { forwardRef, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { formatMoney, formatMoneyForA11y } from '@ui/primitives/money';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { PriceTag } from '../PriceTag/PriceTag';
import { ProductMedia } from '../ProductCard/ProductMedia';
import { QuantityStepper } from '../QuantityStepper/QuantityStepper';
import { useShopTheme } from '../theme/ecommerceTokens';
import type { CartLine } from '../types/domain';

const AVAILABILITY_META = {
  available: null,
  limited: { label: 'Limited stock', icon: 'alert-outline', tone: 'lowStock' as const },
  outOfStock: { label: 'Out of stock', icon: 'close-circle-outline', tone: 'outOfStock' as const },
  substitutionRequired: { label: 'Needs a replacement', icon: 'swap-horizontal', tone: 'lowStock' as const },
};

export interface CartLineItemProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  line: CartLine;
  locale?: string;
  onPress?: (line: CartLine) => void;
  onQuantityChange?: (line: CartLine, next: number) => void;
  onRemove?: (line: CartLine) => void;
  onSaveForLater?: (line: CartLine) => void;
  /** Grocery: choose replacement / accept best match / refund. */
  onChooseSubstitution?: (line: CartLine) => void;
  compact?: boolean;
}

/**
 * A cart row with inline editing.
 *
 * Inline quantity editing is the point — Amazon's cart works because you never
 * have to go back to the product page to change a number. Unavailable lines
 * stay visible with an explicit recovery action rather than silently vanishing.
 */
const CartLineItemBase = forwardRef<View, CartLineItemProps>(function CartLineItem(
  {
    line,
    locale = 'en-IN',
    onPress,
    onQuantityChange,
    onRemove,
    onSaveForLater,
    onChooseSubstitution,
    compact = false,
    animated = true,
    entering = false,
    index = 0,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `cart-line-${line.id}`;
  const meta = AVAILABILITY_META[line.availability];
  const unavailable = line.availability === 'outOfStock';

  const a11yLabel = useMemo(
    () =>
      [
        line.brand,
        line.title,
        line.variantSummary,
        `quantity ${line.quantity.value}`,
        formatMoneyForA11y(line.lineTotal, locale),
        meta?.label,
      ]
        .filter(Boolean)
        .join(', '),
    [line, locale, meta],
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[{ backgroundColor: theme.colors.surface }, containerStyle, style]}
      testID={id}
    >
      <TouchableRipple
        onPress={onPress ? () => onPress(line) : undefined}
        disabled={!onPress}
        accessibilityRole={onPress ? 'link' : 'none'}
        accessibilityLabel={a11yLabel}
      >
        <View style={[styles.row, { padding: theme.spacing.md, gap: theme.spacing.md }]}>
          <View style={{ width: compact ? 56 : 88, opacity: unavailable ? 0.5 : 1 }}>
            <ProductMedia image={line.image} testID={childTestID(id, 'media')} />
          </View>

          <View style={styles.flex}>
            {line.brand ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {line.brand}
              </Text>
            ) : null}

            <Text variant="bodyMedium" numberOfLines={2} testID={childTestID(id, 'title')}>
              {line.title}
            </Text>

            {line.variantSummary ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                {line.variantSummary}
              </Text>
            ) : null}

            {line.fulfillment?.sellerName ? (
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                Sold by {line.fulfillment.sellerName}
              </Text>
            ) : null}

            {line.fulfillment?.deliveryLabel ? (
              <Text variant="labelSmall" style={{ color: shop.colors.deliveryStandard }} numberOfLines={1}>
                {line.fulfillment.deliveryLabel}
              </Text>
            ) : null}

            <PriceTag
              price={{
                sellingPrice: line.unitPrice,
                compareAtPrice: line.compareAtUnitPrice,
              }}
              size="sm"
              showDiscount={false}
              containerStyle={{ marginTop: 2 }}
              testID={childTestID(id, 'unit-price')}
            />

            {meta ? (
              <View style={[styles.row, { gap: 4, marginTop: 2 }]}>
                <Icon source={meta.icon} size={12} color={shop.colors[meta.tone]} />
                <Text variant="labelSmall" style={{ color: shop.colors[meta.tone] }}>
                  {meta.label}
                </Text>
              </View>
            ) : null}

            {/* Substitution is a decision, not a notification. */}
            {line.substitution ? (
              <View
                style={[
                  styles.substitution,
                  { backgroundColor: shop.colors.surfacePromo, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginTop: theme.spacing.xs },
                ]}
              >
                <Text variant="labelSmall" style={{ color: shop.colors.onSurfacePromo }}>
                  {line.substitution.accepted ? 'Replacing with' : 'Suggested replacement'}: {line.substitution.title}
                </Text>
                {onChooseSubstitution ? (
                  <AppButton
                    variant="ghost"
                    size="sm"
                    onPress={() => onChooseSubstitution(line)}
                    containerStyle={{ marginTop: 4 }}
                    testID={childTestID(id, 'substitution')}
                  >
                    Choose a replacement
                  </AppButton>
                ) : null}
              </View>
            ) : null}

            <View style={[styles.actionsRow, { marginTop: theme.spacing.sm, gap: theme.spacing.sm }]}>
              {unavailable ? null : (
                <QuantityStepper
                  value={line.quantity.value}
                  min={line.quantity.min}
                  max={line.quantity.max}
                  step={line.quantity.step}
                  unit={line.quantity.unit}
                  disabledReason={line.quantity.disabledReason}
                  updateState={line.quantity.updateState}
                  itemLabel={line.title}
                  size="sm"
                  variant="cart"
                  allowDirectEntry
                  onChange={(next) => onQuantityChange?.(line, next)}
                  onRemove={() => onRemove?.(line)}
                  testID={childTestID(id, 'quantity')}
                />
              )}

              <View style={styles.flex} />

              <Text variant="titleSmall" style={styles.tabular} testID={childTestID(id, 'total')}>
                {formatMoney(line.lineTotal, { locale })}
              </Text>
            </View>

            <View style={[styles.actionsRow, { gap: theme.spacing.md, marginTop: theme.spacing.xs }]}>
              {onRemove ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onRemove(line)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${line.title} from cart`}
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(id, 'remove')}
                >
                  Remove
                </Text>
              ) : null}
              {onSaveForLater ? (
                <Text
                  variant="labelSmall"
                  onPress={() => onSaveForLater(line)}
                  accessibilityRole="button"
                  accessibilityLabel={`Save ${line.title} for later`}
                  style={{ color: theme.colors.primary }}
                  testID={childTestID(id, 'save')}
                >
                  {line.savedForLater ? 'Move to cart' : 'Save for later'}
                </Text>
              ) : null}
              {line.actions?.map((action) => (
                <Text
                  key={action.key}
                  variant="labelSmall"
                  onPress={action.onPress}
                  accessibilityRole="button"
                  style={{ color: action.destructive ? shop.colors.priceDeal : theme.colors.primary }}
                >
                  {action.label}
                </Text>
              ))}
            </View>
          </View>
        </View>
      </TouchableRipple>
      <Divider />
    </Animated.View>
  );
});

export const CartLineItem = memo(CartLineItemBase);
CartLineItem.displayName = 'CartLineItem';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  substitution: {},
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
