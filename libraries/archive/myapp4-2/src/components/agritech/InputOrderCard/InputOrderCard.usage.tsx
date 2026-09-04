import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { InputOrderCard } from './InputOrderCard';
import sample from './InputOrderCard.sample.json';
import { loadSample } from '../types/sample';
import type { InputProduct } from '../types/domain';

const PRODUCTS = loadSample<{ products: InputProduct[] }>(sample).products;

export const InputOrderCardUsage = () => {
  const theme = useAppTheme();
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {PRODUCTS.map((product) => (
        <View key={product.id}>
          <InputOrderCard
            product={product}
            quantity={quantities[product.id] ?? 1}
            onQuantityChange={(q) => setQuantities((prev) => ({ ...prev, [product.id]: q }))}
            onAddToCart={() => {}}
            onViewDetails={() => {}}
          />
        </View>
      ))}
    </ScrollView>
  );
};
