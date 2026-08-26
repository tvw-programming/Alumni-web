import React, { forwardRef, memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { RatingStars } from '@ui/atoms/RatingStars';
import { useMotion, usePressAnimation, type AnimatableProps } from '@/hooks';
import { formatMoneyForA11y } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { PriceTag } from '../PriceTag/PriceTag';
import { useShopTheme } from '../theme/ecommerceTokens';
import type { Availability, ProductCardData, VariantOption } from '../types/domain';
import { ProductMedia } from './ProductMedia';

export type ProductCardVariant = 'grid' | 'list' | 'compact';

const AVAILABILITY_COPY: Record<Availability, { label: string; icon?: string } | null> = {
  available: null,
  lowStock: { label: 'Only a few left', icon: 'alert-outline' },
  outOfStock: { label: 'Sold out', icon: 'close-circle-outline' },
  unknown: { label: 'Check availability', icon: 'help-circle-outline' },
};

export interface ProductCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  product: ProductCardData;
  variant?: ProductCardVariant;
  /** Fashion cards use a taller media ratio. */
  media?: 'product' | 'fashion';
  locale?: string;
  wishlisted?: boolean;
  onPress: (product: ProductCardData) => void;
  onWishlistToggle?: (product: ProductCardData, next: boolean) => void;
  /** Slot: AddToCartButton / QuantityStepper live here, so the card stays generic. */
  primaryAction?: React.ReactNode;
  /** Slot overrides. */
  priceBlock?: React.ReactNode;
  deliveryInfo?: React.ReactNode;
  variantPreview?: React.ReactNode;
}

const SwatchRow = memo(function SwatchRow({ options, testID }: { options: VariantOption[]; testID?: string }) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const visible = options.slice(0, 4);
  const extra = options.length - visible.length;

  return (
    <View style={[styles.row, { gap: 4 }]} testID={testID}>
      {visible.map((option) => (
        <View
          key={option.id}
          style={{
            width: 14,
            height: 14,
            borderRadius: theme.radii.pill,
            backgroundColor: option.swatch?.color ?? theme.colors.surfaceVariant,
            borderWidth: 1,
            borderColor: shop.colors.swatchBorder,
            opacity: option.availability === 'outOfStock' ? 0.4 : 1,
          }}
        />
      ))}
      {extra > 0 ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          +{extra}
        </Text>
      ) : null}
    </View>
  );
});

/**
 * The catalogue workhorse.
 *
 * Accessibility note that drives the structure: the card is NOT one giant
 * ambiguous link. The product region is a single button with a composed name
 * (brand, title, price, availability), and the wishlist toggle is a separate,
 * separately-labelled control — so a screen-reader user can reach either.
 */
const ProductCardBase = forwardRef<View, ProductCardProps>(function ProductCard(
  {
    product,
    variant = 'grid',
    media = 'product',
    locale = 'en-IN',
    wishlisted = false,
    onPress,
    onWishlistToggle,
    primaryAction,
    priceBlock,
    deliveryInfo,
    variantPreview,
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
  const { animatedStyle, onPressIn, onPressOut } = usePressAnimation({
    animation: 'scale',
    animated,
    scaleTo: 0.98,
  });

  const isList = variant === 'list' || variant === 'compact';
  const soldOut = product.availability === 'outOfStock';
  const availabilityCopy = AVAILABILITY_COPY[product.availability];
  const id = testID ?? `product-${product.id}`;

  /** One composed name so the card reads as a sentence, not a pile of fragments. */
  const accessibleName = useMemo(() => {
    const parts = [product.brand, product.title];
    if (product.price) {
      parts.push(formatMoneyForA11y(product.price.sellingPrice, locale));
      if (product.price.discount) parts.push(product.price.discount.label);
    }
    if (product.rating) parts.push(`rated ${product.rating.average} out of 5, ${product.rating.count} reviews`);
    if (availabilityCopy) parts.push(availabilityCopy.label);
    // Sponsored disclosure must be spoken, not only shown.
    if (product.sponsored) parts.push('Sponsored');
    if (product.deliveryPromise?.locationChecked) parts.push(product.deliveryPromise.label);
    return parts.filter(Boolean).join(', ');
  }, [availabilityCopy, locale, product]);

  const mediaBlock = (
    <ProductMedia
      image={product.image}
      aspectRatio={media === 'fashion' ? shop.layout.fashionMediaAspectRatio : shop.layout.productMediaAspectRatio}
      badges={product.badges}
      dimmed={soldOut}
      overlayLabel={soldOut ? 'Sold out' : undefined}
      testID={childTestID(id, 'media')}
      overlay={
        onWishlistToggle ? (
          // Separate control, separate label — never folded into the card link.
          <IconButton
            icon={wishlisted ? 'heart' : 'heart-outline'}
            size={18}
            mode="contained"
            containerColor={theme.colors.surface}
            iconColor={wishlisted ? shop.colors.priceDeal : theme.colors.onSurfaceVariant}
            onPress={() => onWishlistToggle(product, !wishlisted)}
            accessibilityLabel={
              wishlisted ? `Remove ${product.title} from wishlist` : `Add ${product.title} to wishlist`
            }
            accessibilityState={{ selected: wishlisted }}
            testID={childTestID(id, 'wishlist')}
          />
        ) : undefined
      }
    />
  );

  const details = (
    <View style={[styles.details, { padding: theme.spacing.sm, gap: 2 }]}>
      {product.sponsored ? (
        <Text variant="labelSmall" style={{ color: shop.colors.sponsored }}>
          Sponsored
        </Text>
      ) : null}
      {product.personalizationLabel ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
          {product.personalizationLabel}
        </Text>
      ) : null}

      {product.brand ? (
        <Text variant="labelMedium" numberOfLines={1} style={{ color: theme.colors.onSurface }}>
          {product.brand}
        </Text>
      ) : null}

      <Text
        variant="bodyMedium"
        // Fixed line count keeps card heights stable across a grid.
        numberOfLines={shop.layout.titleLines}
        style={{ color: theme.colors.onSurfaceVariant, minHeight: 36 }}
        testID={childTestID(id, 'title')}
      >
        {product.title}
      </Text>

      {product.rating ? (
        <View style={[styles.row, { gap: 4 }]}>
          <RatingStars value={product.rating.average} readonly allowHalf size="sm" entering={false} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            ({product.rating.count})
          </Text>
        </View>
      ) : null}

      {priceBlock ?? (product.price ? <PriceTag price={product.price} size="md" locale={locale} testID={childTestID(id, 'price')} /> : null)}

      {variantPreview ??
        (product.variantPreview?.length ? (
          <SwatchRow options={product.variantPreview} testID={childTestID(id, 'swatches')} />
        ) : null)}

      {deliveryInfo ??
        (product.deliveryPromise ? (
          <Text
            variant="labelSmall"
            style={{
              color:
                product.deliveryPromise.speed === 'instant' || product.deliveryPromise.speed === 'fast'
                  ? shop.colors.deliveryFast
                  : product.deliveryPromise.speed === 'delayed'
                    ? shop.colors.deliveryDelayed
                    : shop.colors.deliveryStandard,
            }}
            numberOfLines={1}
          >
            {/* An unchecked promise is hedged, never stated as fact. */}
            {product.deliveryPromise.locationChecked
              ? product.deliveryPromise.label
              : `${product.deliveryPromise.label} — check your pincode`}
          </Text>
        ) : null)}

      {availabilityCopy ? (
        <View style={[styles.row, { gap: 4 }]}>
          {availabilityCopy.icon ? (
            <Icon
              source={availabilityCopy.icon}
              size={12}
              color={soldOut ? shop.colors.outOfStock : shop.colors.lowStock}
            />
          ) : null}
          <Text
            variant="labelSmall"
            style={{ color: soldOut ? shop.colors.outOfStock : shop.colors.lowStock }}
          >
            {availabilityCopy.label}
          </Text>
        </View>
      ) : null}

      {product.sellerCount && product.sellerCount > 1 ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {product.sellerCount} sellers
        </Text>
      ) : null}

      {product.minOrderQuantity && product.minOrderQuantity > 1 ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Minimum {product.minOrderQuantity}
        </Text>
      ) : null}

      {product.ageRestricted ? (
        <Text variant="labelSmall" style={{ color: shop.colors.lowStock }}>
          Age-restricted — ID required at delivery
        </Text>
      ) : null}

      {primaryAction ? <View style={{ marginTop: theme.spacing.xs }}>{primaryAction}</View> : null}
    </View>
  );

  return (
    <Animated.View
      ref={ref}
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={[
        {
          backgroundColor: shop.colors.surfaceProduct,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: theme.colors.outlineVariant,
          overflow: 'hidden',
        },
        containerStyle,
        animatedStyle,
        style,
      ]}
      testID={id}
    >
      {/* The tappable product region, labelled as one coherent thing. */}
      <TouchableRipple
        onPress={() => onPress(product)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="link"
        accessibilityLabel={accessibleName}
        accessibilityHint="Opens product details"
        testID={childTestID(id, 'link')}
      >
        <View style={isList ? styles.listLayout : undefined}>
          <View style={isList ? { width: shop.layout.listCardMediaSize } : undefined}>{mediaBlock}</View>
          <View style={isList ? styles.flex : undefined}>{details}</View>
        </View>
      </TouchableRipple>
    </Animated.View>
  );
});

export const ProductCard = memo(ProductCardBase);
ProductCard.displayName = 'ProductCard';

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  details: {},
  listLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  flex: { flex: 1 },
});
