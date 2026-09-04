/**
 * USAGE — ProductCard
 *
 * Grid and list variants share one data model. The card takes the add-to-cart
 * control as a slot, so it never learns anything about cart state itself.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View, useWindowDimensions } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AddToCartState, ProductCardData } from '../types/domain';
import { AddToCartButton } from '../AddToCartButton/AddToCartButton';
import { ProductCard, type ProductCardVariant } from './ProductCard';
import sample from './ProductCard.sample.json';

const { products } = loadSample<{ products: ProductCardData[] }>(sample);

export const ProductCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const { width } = useWindowDimensions();

  const [variant, setVariant] = useState<ProductCardVariant>('grid');
  const [wishlist, setWishlist] = useState<string[]>(['sku-2']);
  const [cartStates, setCartStates] = useState<Record<string, AddToCartState>>({});

  const columnWidth = (width - theme.spacing.md * 3) / 2;

  /** The card renders the button; this screen owns the mutation. */
  const addToCart = useCallback(
    async (product: ProductCardData) => {
      if (product.availability === 'outOfStock') return;
      setCartStates((prev) => ({ ...prev, [product.id]: 'loading' }));
      await new Promise((resolve) => setTimeout(resolve, 700));
      setCartStates((prev) => ({ ...prev, [product.id]: 'added' }));
      toast.success(`${product.title.slice(0, 24)}… added`);
    },
    [toast],
  );

  const stateFor = (product: ProductCardData): AddToCartState => {
    if (product.availability === 'outOfStock') return 'outOfStock';
    // A product with variants must route to the selector, not guess a size.
    if (product.variantPreview?.length) return cartStates[product.id] ?? 'chooseOptions';
    return cartStates[product.id] ?? 'idle';
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={variant}
        onValueChange={(next) => setVariant(next as ProductCardVariant)}
        buttons={[
          { value: 'grid', label: 'Grid' },
          { value: 'list', label: 'List' },
          { value: 'compact', label: 'Compact' },
        ]}
      />

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Image URIs are intentionally unreachable, so every card shows the broken-image fallback with its alt text.
      </Text>

      <View style={variant === 'grid' ? { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md } : { gap: theme.spacing.md }}>
        {products.map((product, index) => (
          <View key={product.id} style={variant === 'grid' ? { width: columnWidth } : undefined}>
            <ProductCard
              product={product}
              variant={variant}
              media={product.brand === 'Nimbus' ? 'fashion' : 'product'}
              index={index}
              entering="slideUp"
              wishlisted={wishlist.includes(product.id)}
              onPress={(p) => toast.show(`Opening ${p.title.slice(0, 20)}…`)}
              onWishlistToggle={(p, next) =>
                setWishlist((prev) => (next ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
              }
              primaryAction={
                <AddToCartButton
                  state={stateFor(product)}
                  productId={product.id}
                  itemLabel={product.title}
                  size="sm"
                  variant={variant === 'grid' ? 'compact' : 'withStepper'}
                  quantity={{ value: 1, min: 1, max: 5, step: 1 }}
                  onAdd={() => void addToCart(product)}
                  onChooseOptions={() => toast.warning('Select a size first')}
                  onNotifyMe={() => toast.success('We will notify you')}
                  onViewCart={() => toast.show('Opening cart')}
                />
              }
            />
          </View>
        ))}
      </View>
    </ScrollView>
  );
};
