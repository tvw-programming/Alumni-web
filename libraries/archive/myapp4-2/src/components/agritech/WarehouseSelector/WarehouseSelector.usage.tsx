import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { WarehouseSelector } from './WarehouseSelector';
import sample from './WarehouseSelector.sample.json';
import { loadSample } from '../types/sample';
import type { Warehouse } from '../types/domain';

const WAREHOUSES = loadSample<{ warehouses: Warehouse[] }>(sample).warehouses;

export const WarehouseSelectorUsage = () => {
  const theme = useAppTheme();
  const [inlineSelected, setInlineSelected] = useState(WAREHOUSES[0]?.id);
  const [menuSelected, setMenuSelected] = useState(WAREHOUSES[0]?.id);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View>
        <Text style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>Menu variant</Text>
        <WarehouseSelector warehouses={WAREHOUSES} selectedId={menuSelected} variant="menu" onChange={setMenuSelected} />
      </View>
      <View>
        <Text style={{ marginBottom: 8, color: theme.colors.onSurfaceVariant }}>Inline variant</Text>
        <WarehouseSelector warehouses={WAREHOUSES} selectedId={inlineSelected} variant="inline" onChange={setInlineSelected} />
      </View>
    </ScrollView>
  );
};
