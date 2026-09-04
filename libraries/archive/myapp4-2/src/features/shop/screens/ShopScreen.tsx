import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AddToCartButtonUsage,
  AddressPickerUsage,
  CartUsage,
  CouponInputUsage,
  FilterSortSheetUsage,
  FulfillmentUsage,
  ImageCarouselUsage,
  PriceTagUsage,
  ProductCardUsage,
  QuantityStepperUsage,
  ReviewsUsage,
  VariantSelectorUsage,
} from '@ui/ecommerce';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/** Live gallery. Each row renders that component's own `*.usage.tsx`. */
const ENTRIES: Entry[] = [
  { key: 'product', title: 'ProductCard', description: 'Grid, list and compact; sponsored, sold-out, grocery, fashion', Component: ProductCardUsage },
  { key: 'price', title: 'PriceTag', description: 'MRP strikethrough, discount chip, unit price, conditional coupons', Component: PriceTagUsage },
  { key: 'quantity', title: 'QuantityStepper', description: 'Limits with reasons, fractional units, optimistic rollback', Component: QuantityStepperUsage },
  { key: 'addToCart', title: 'AddToCartButton', description: 'idle → loading → added, chooseOptions, notify-me, retry', Component: AddToCartButtonUsage },
  { key: 'cart', title: 'CartLineItem + CartSummaryCard', description: 'Inline editing, substitutions, transparent fees', Component: CartUsage },
  { key: 'gallery', title: 'ImageCarousel + ThumbnailStrip', description: 'Swipe + thumbnails, fullscreen, video, variant switch', Component: ImageCarouselUsage },
  { key: 'variants', title: 'VariantSelector', description: 'Swatches, constraint resolver, no silent size changes', Component: VariantSelectorUsage },
  { key: 'filters', title: 'FilterSortSheet', description: 'Checkbox / radio / range / swatch facets, applied-chip bar', Component: FilterSortSheetUsage },
  { key: 'reviews', title: 'ReviewCard + RatingBreakdown', description: 'Histogram filtering, media, merchant response, moderation', Component: ReviewsUsage },
  { key: 'address', title: 'AddressCard + AddressPicker', description: 'Serviceability, near-identical addresses, change consequences', Component: AddressPickerUsage },
  { key: 'coupon', title: 'CouponInput', description: 'Server-authoritative validation, offer list, revalidation', Component: CouponInputUsage },
  { key: 'fulfillment', title: 'DeliverySlotPicker + OrderTracker', description: 'Slot fees up front, split shipments, honest delay copy', Component: FulfillmentUsage },
];

export const ShopScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((item) => item.key === active), [active]);

  if (entry) {
    const { Component } = entry;
    return (
      <View style={styles.flex}>
        <View style={[styles.header, { padding: theme.spacing.md, backgroundColor: theme.colors.surface }]}>
          <Text variant="titleMedium" style={styles.flex}>
            {entry.title}
          </Text>
          <Text
            variant="labelLarge"
            onPress={() => setActive(null)}
            accessibilityRole="button"
            style={{ color: theme.colors.primary }}
          >
            Back
          </Text>
        </View>
        <Component />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <StateView
        preset="success"
        compact
        title="E-commerce component library"
        description="12 components, each with a sample JSON payload and a compiling usage example."
      />

      <AppCard variant="outlined" padded={false}>
        {ENTRIES.map((item, index) => (
          <List.Item
            key={item.key}
            title={item.title}
            description={item.description}
            descriptionNumberOfLines={2}
            onPress={() => setActive(item.key)}
            left={() => (
              <View style={[styles.index, { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.pill }]}>
                <Text variant="labelSmall">{index + 1}</Text>
              </View>
            )}
            right={() => <List.Icon icon="chevron-right" />}
            testID={`shop-entry-${item.key}`}
          />
        ))}
      </AppCard>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  index: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
