import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { AppFAB, PaginatedList, SearchHeader, useToast } from '@ui';
import { useCartStore, usePreferencesStore, selectCartCount } from '@/store';
import { PRODUCT_CATEGORIES } from '@/services/mockData';
import type { Product } from '@/services/types';
import type { CatalogStackParamList } from '@/navigation/types';

import { ProductCard } from '../components/ProductCard';
import { useProducts } from '../hooks/useProducts';

const FILTERS = PRODUCT_CATEGORIES.map((category) => ({ key: category, label: category }));

/**
 * Note what this screen does NOT contain: no loading spinner, no empty view, no
 * error view, no pagination bookkeeping, no animation code. All of it lives in
 * `PaginatedList` and is shared with every other list in the app.
 */
export const CatalogScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<CatalogStackParamList>>();
  const toast = useToast();

  const [search, setSearch] = useState('');
  const [categories, setCategories] = useState<string[]>([]);

  const addToCart = useCartStore((state) => state.add);
  const cartCount = useCartStore(selectCartCount);
  const recentSearches = usePreferencesStore((state) => state.recentSearches);
  const addRecentSearch = usePreferencesStore((state) => state.addRecentSearch);

  const { products, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage, refetch, isRefetching, error } =
    useProducts(search, categories);

  const handleSearch = useCallback(
    (term: string) => {
      setSearch(term);
      if (term) addRecentSearch(term);
    },
    [addRecentSearch],
  );

  const handleOpen = useCallback(
    (product: Product) => navigation.navigate('ProductDetail', { productId: product.id }),
    [navigation],
  );

  const handleAdd = useCallback(
    (product: Product) => {
      addToCart(product);
      toast.success(`${product.name} added`, {
        action: { label: 'View cart', onPress: () => navigation.navigate('Checkout') },
      });
    },
    [addToCart, navigation, toast],
  );

  return (
    <View style={styles.flex}>
      <PaginatedList<Product>
        data={products}
        estimatedItemSize={168}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ProductCard product={item} index={index} onPress={handleOpen} onAdd={handleAdd} />
        )}
        loading={isLoading}
        loadingMore={isFetchingNextPage}
        hasMore={!!hasNextPage}
        onEndReached={() => void fetchNextPage()}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        error={error}
        onRetry={() => void refetch()}
        trackScroll
        skeletonShape="card"
        skeletonCount={4}
        emptyState={{
          preset: 'noResults',
          primaryAction: { label: 'Clear filters', onPress: () => { setSearch(''); setCategories([]); } },
        }}
        style={{ padding: 16 }}
        testID="catalog-list"
        header={
          <SearchHeader
            placeholder="Search products"
            onSearch={handleSearch}
            filters={FILTERS}
            activeFilters={categories}
            onFilterChange={setCategories}
            recentSearches={recentSearches}
            collapseOnScroll
            testID="catalog-search"
          />
        }
      />

      <AppFAB
        variant="extended"
        icon="cart"
        label={cartCount > 0 ? `Checkout (${cartCount})` : 'Cart'}
        visible={cartCount > 0}
        hideOnScroll
        onPress={() => navigation.navigate('Checkout')}
        testID="catalog-fab"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
