import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { formatMoney } from '@ui/primitives/money';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { InputAvailability, InputProduct } from '../types/domain';

export interface InputOrderCardProps extends StyleEscapeHatches {
  product: InputProduct;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  onAddToCart: (product: InputProduct) => void;
  onViewDetails?: (product: InputProduct) => void;
}

const AVAILABILITY_META: Record<InputAvailability, { label: string; colorKey: 'online' | 'warning' | 'error' }> = {
  available: { label: 'In stock', colorKey: 'online' },
  lowStock: { label: 'Low stock', colorKey: 'warning' },
  outOfStock: { label: 'Out of stock', colorKey: 'error' },
  locationRestricted: { label: 'Not available in your area', colorKey: 'error' },
};

/**
 * Dosage, safety, and regulatory detail live on the product detail surface,
 * not on this card — `onViewDetails` is the only path to that information.
 * Availability always pairs an icon and a word with its colour.
 */
export const InputOrderCard = ({ product, quantity, onQuantityChange, onAddToCart, onViewDetails, style, containerStyle, testID }: InputOrderCardProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `input-${product.id}`;
  const meta = AVAILABILITY_META[product.availability];
  const orderable = product.availability === 'available' || product.availability === 'lowStock';
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={styles.row}>
        <View style={[styles.thumb, { borderRadius: theme.radii.sm, backgroundColor: agri.colors.surfaceVariant }]}>
          {product.imageUri?.uri && !imageFailed ? (
            <Image source={{ uri: product.imageUri.uri }} style={styles.thumbImg} onError={() => setImageFailed(true)} accessibilityLabel={product.imageUri.alt ?? product.name} />
          ) : (
            <Icon source="package-variant" size={24} color={agri.colors.onSurfaceVariant} />
          )}
        </View>
        <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
          <View style={styles.row}>
            <Text variant="titleSmall" style={styles.flex} numberOfLines={2}>
              {product.name}
            </Text>
            {product.verified ? <Icon source="check-decagram" size={16} color={theme.colors.primary} /> : null}
          </View>
          {product.brand ? (
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              {product.brand} · {product.packSize}
            </Text>
          ) : (
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              {product.packSize}
            </Text>
          )}
          <Text variant="titleSmall" style={{ marginTop: 2 }}>
            {formatMoney(product.price)}
          </Text>
        </View>
      </View>

      <View style={[styles.row, { marginTop: 8 }]}>
        <Icon source={product.availability === 'available' ? 'check-circle-outline' : 'alert-circle-outline'} size={12} color={agri.colors[meta.colorKey]} />
        <Text variant="labelSmall" style={{ color: agri.colors[meta.colorKey], marginLeft: 4, flex: 1 }}>
          {meta.label}
          {product.deliveryLabel && orderable ? ` · ${product.deliveryLabel}` : ''}
        </Text>
      </View>

      {product.cropSuitability && product.cropSuitability.length > 0 ? (
        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant, marginTop: 2 }}>
          Recommended for {product.cropSuitability.join(', ')}
        </Text>
      ) : null}

      <View style={[styles.row, { marginTop: 8 }]}>
        {orderable ? (
          <View style={[styles.stepper, { borderRadius: theme.radii.sm, borderColor: agri.colors.surfaceVariant }]}>
            <IconButton icon="minus" size={14} onPress={() => onQuantityChange(Math.max(0, quantity - 1))} accessibilityLabel="Decrease quantity" style={styles.noMargin} testID={childTestID(id, 'decrement')} />
            <Text variant="labelMedium" accessibilityLabel={`Quantity ${quantity}`}>
              {quantity}
            </Text>
            <IconButton icon="plus" size={14} onPress={() => onQuantityChange(quantity + 1)} accessibilityLabel="Increase quantity" style={styles.noMargin} testID={childTestID(id, 'increment')} />
          </View>
        ) : null}
        <View style={styles.flex} />
        {orderable ? (
          <AppButton variant="primary" size="sm" onPress={() => onAddToCart(product)} testID={childTestID(id, 'add')}>
            Add to cart
          </AppButton>
        ) : onViewDetails ? (
          <AppButton variant="ghost" size="sm" onPress={() => onViewDetails(product)} testID={childTestID(id, 'ask')}>
            Ask an agronomist
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  thumb: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  thumbImg: { width: 56, height: 56 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 4 },
  noMargin: { margin: 0 },
});
