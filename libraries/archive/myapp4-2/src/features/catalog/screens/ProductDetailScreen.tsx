import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import {
  AppButton,
  AppCard,
  AvatarStack,
  RatingStars,
  SkeletonLoader,
  StateView,
  StatusBadge,
  useSheet,
  useToast,
} from '@ui';
import { useAppTheme } from '@/theme';
import { useCartStore } from '@/store';
import { formatMinorUnits } from '@/utils';
import type { CatalogStackParamList } from '@/navigation/types';

import { useProduct } from '../hooks/useProducts';

const REVIEWERS = [
  { id: 'u1', name: 'Asha Rao' },
  { id: 'u2', name: 'Vikram Shah' },
  { id: 'u3', name: 'Leena George' },
  { id: 'u4', name: 'Noor Ali' },
  { id: 'u5', name: 'Dev Menon' },
  { id: 'u6', name: 'Priya Nair' },
];

export const ProductDetailScreen = () => {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<CatalogStackParamList, 'ProductDetail'>>();
  const navigation = useNavigation<NativeStackNavigationProp<CatalogStackParamList>>();
  const sheet = useSheet();
  const toast = useToast();
  const addToCart = useCartStore((state) => state.add);

  const { data: product, isLoading, error, refetch } = useProduct(route.params.productId);

  const openSpecs = useCallback(() => {
    sheet.open(
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="bodyMedium">{product?.description}</Text>
        <Divider />
        <Text variant="labelMedium">Category</Text>
        <Text variant="bodyMedium">{product?.category}</Text>
        <Text variant="labelMedium">Availability</Text>
        <StatusBadge status={product?.inStock ? 'in_stock' : 'out_of_stock'} withDot />
      </View>,
      { title: 'Specifications', variant: 'bottom', scrollable: true },
    );
  }, [product, sheet, theme.spacing.sm]);

  if (isLoading) {
    return (
      <View style={{ padding: theme.spacing.md }}>
        <SkeletonLoader shape="card" />
        <SkeletonLoader shape="text" lines={4} containerStyle={{ marginTop: theme.spacing.lg }} />
      </View>
    );
  }

  if (error || !product) {
    return <StateView preset="error" primaryAction={{ label: 'Try again', onPress: () => void refetch() }} />;
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <AppCard variant="filled" entering="fade" padded contentPadding="lg" testID="product-hero">
        <Text variant="headlineSmall">{product.name}</Text>
        <Text variant="titleLarge" style={{ marginTop: theme.spacing.xs, color: theme.colors.primary }}>
          {formatMinorUnits(product.priceMinor, product.currency, 'en-IN')}
        </Text>

        <View style={[styles.row, { gap: theme.spacing.sm, marginTop: theme.spacing.sm }]}>
          <RatingStars value={product.rating} readonly allowHalf showValue />
          <StatusBadge status={product.inStock ? 'in_stock' : 'out_of_stock'} withDot pulse={!product.inStock} />
        </View>
      </AppCard>

      <AppCard variant="outlined" title="What people say" entering="slideUp" index={1}>
        <View style={[styles.row, { gap: theme.spacing.md, marginTop: theme.spacing.sm }]}>
          <AvatarStack users={REVIEWERS} max={4} onPress={() => toast.show('Reviews coming soon')} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {product.ratingCount} verified reviews
          </Text>
        </View>
      </AppCard>

      <AppCard variant="outlined" title="Rate this product" entering="slideUp" index={2}>
        <RatingStars
          defaultValue={0}
          onChange={(value) => toast.success(`Thanks — you rated ${value} star${value === 1 ? '' : 's'}`)}
          showValue
          containerStyle={{ marginTop: theme.spacing.sm }}
          testID="product-rating"
        />
      </AppCard>

      <AppButton variant="secondary" fullWidth icon="information-outline" onPress={openSpecs} testID="product-specs">
        View specifications
      </AppButton>

      <AppButton
        variant="primary"
        fullWidth
        size="lg"
        disabled={!product.inStock}
        debounceMs={800}
        onPress={() => {
          addToCart(product);
          toast.success('Added to cart', {
            action: { label: 'Checkout', onPress: () => navigation.navigate('Checkout') },
          });
        }}
        testID="product-add"
      >
        {product.inStock ? 'Add to cart' : 'Sold out'}
      </AppButton>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
