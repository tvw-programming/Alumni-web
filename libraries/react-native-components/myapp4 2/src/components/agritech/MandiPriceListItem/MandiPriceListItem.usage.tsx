import React from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { MandiPriceListItem } from './MandiPriceListItem';
import sample from './MandiPriceListItem.sample.json';
import { loadSample } from '../types/sample';
import type { MandiPrice } from '../types/domain';

const PRICES = loadSample<{ prices: MandiPrice[] }>(sample).prices;

export const MandiPriceListItemUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {PRICES.map((price, i) => (
        <React.Fragment key={price.id}>
          <MandiPriceListItem price={price} onPress={() => {}} />
          {i < PRICES.length - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
