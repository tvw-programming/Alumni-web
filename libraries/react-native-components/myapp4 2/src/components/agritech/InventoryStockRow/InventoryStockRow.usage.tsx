import React from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { InventoryStockRow } from './InventoryStockRow';
import sample from './InventoryStockRow.sample.json';
import { loadSample } from '../types/sample';
import type { InventoryStockItem } from '../types/domain';

const ITEMS = loadSample<{ items: InventoryStockItem[] }>(sample).items;

export const InventoryStockRowUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {ITEMS.map((item, i) => (
        <React.Fragment key={item.sku}>
          <InventoryStockRow item={item} onPress={() => {}} onAdjust={() => {}} />
          {i < ITEMS.length - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
