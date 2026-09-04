import React, { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton, AppCard, RatingStars, StatusBadge } from '@ui';
import { useAppTheme } from '@/theme';
import type { Product } from '@/services/types';
import { formatMinorUnits } from '@/utils';

export interface ProductCardProps {
  product: Product;
  index: number;
  onPress: (product: Product) => void;
  onAdd: (product: Product) => void;
}

/**
 * A feature component: it knows about `Product`, and composes library
 * components. The library components know nothing about it. That direction of
 * dependency is the whole architecture in one sentence.
 */
export const ProductCard = memo(function ProductCard({ product, index, onPress, onAdd }: ProductCardProps) {
  const theme = useAppTheme();

  const handlePress = useCallback(() => onPress(product), [onPress, product]);
  const handleAdd = useCallback(() => onAdd(product), [onAdd, product]);

  return (
    <AppCard
      variant="outlined"
      title={product.name}
      subtitle={product.category}
      onPress={handlePress}
      entering="slideUp"
      index={index}
      containerStyle={{ marginBottom: theme.spacing.sm }}
      testID={`product-${product.id}`}
      actions={
        <AppButton
          variant={product.inStock ? 'primary' : 'secondary'}
          size="sm"
          disabled={!product.inStock}
          onPress={handleAdd}
          debounceMs={600}
          testID={`product-${product.id}-add`}
        >
          {product.inStock ? 'Add to cart' : 'Sold out'}
        </AppButton>
      }
    >
      <View style={[styles.meta, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
        <Text variant="titleMedium">{formatMinorUnits(product.priceMinor, product.currency, 'en-IN')}</Text>
        <StatusBadge
          status={product.inStock ? 'in_stock' : 'out_of_stock'}
          size="sm"
          withDot
          pulse={!product.inStock}
        />
      </View>

      <View style={[styles.meta, { gap: theme.spacing.xs }]}>
        <RatingStars value={product.rating} readonly allowHalf size="sm" entering={false} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {product.ratingCount} reviews
        </Text>
      </View>
    </AppCard>
  );
});

const styles = StyleSheet.create({
  meta: { flexDirection: 'row', alignItems: 'center' },
});
