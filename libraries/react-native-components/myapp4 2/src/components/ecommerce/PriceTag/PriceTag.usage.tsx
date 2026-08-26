/**
 * USAGE — PriceTag
 *
 * The interesting cases are the defensive ones: MRP equal to the sale price is
 * suppressed, and a conditional coupon discount renders differently from an
 * automatic one.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PriceModel } from '../types/domain';
import { PriceTag } from './PriceTag';
import sample from './PriceTag.sample.json';

const samples = loadSample<Record<string, PriceModel>>(sample);

const LABELS: Record<string, string> = {
  standard: 'Standard — no reference price',
  saleWithMrp: 'Sale with MRP strikethrough',
  mrpEqualsSale: 'MRP === sale price (strikethrough suppressed)',
  tinyDiscount: 'Sub-1% discount, shown as an amount',
  couponConditional: 'Conditional coupon discount (different treatment)',
  memberPrice: 'Member pricing qualifier',
  unitPriced: 'Grocery unit pricing',
  fromPrice: '"From" price for a variant product',
  taxExcluded: 'Tax-exclusive mode',
  foreignCurrency: 'Different currency + locale',
};

export const PriceTagUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {Object.entries(samples)
        .filter(([key]) => !key.startsWith('$'))
        .map(([key, price]) => (
          <View key={key} style={{ gap: theme.spacing.xs }}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {LABELS[key] ?? key}
            </Text>
            <PriceTag
              price={price}
              size="lg"
              locale={price.sellingPrice.currency === 'USD' ? 'en-US' : 'en-IN'}
              emphasis={key === 'couponConditional' ? 'deal' : 'default'}
              testID={`price-${key}`}
            />
            <Divider />
          </View>
        ))}

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Sizes
      </Text>
      <View style={{ gap: theme.spacing.sm }}>
        <PriceTag price={samples.saleWithMrp!} size="sm" />
        <PriceTag price={samples.saleWithMrp!} size="md" />
        <PriceTag price={samples.saleWithMrp!} size="lg" />
        <PriceTag price={samples.saleWithMrp!} size="lg" layout="stacked" />
      </View>

      <PriceTag price={samples.standard!} unavailable testID="price-unavailable" />
    </ScrollView>
  );
};
