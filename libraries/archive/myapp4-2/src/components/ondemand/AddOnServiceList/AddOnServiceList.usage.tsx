/**
 * USAGE — AddOnServiceList
 *
 * The list only emits selection intent; the running total below is computed by
 * the screen, which is the separation the spec asks for.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { MoneyRow } from '@ui/molecules/MoneyRow';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AddOn } from '../types/domain';
import { AddOnServiceList } from './AddOnServiceList';
import sample from './AddOnServiceList.sample.json';

const { addOns: initial } = loadSample<{ addOns: AddOn[] }>(sample);

export const AddOnServiceListUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [addOns, setAddOns] = useState<AddOn[]>(initial);

  const total = useMemo(
    () =>
      addOns
        .filter((item) => item.selected || item.required)
        .reduce((sum, item) => sum + item.price.minorUnits * (item.quantity ?? 1), 0),
    [addOns],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        "Same-day service" stays visible but disabled with a stated reason — a strikethrough alone would not survive
        colour-blindness or a screen reader.
      </Text>

      <AppCard variant="outlined" title="Add-on services" padded>
        <AddOnServiceList
          addOns={addOns}
          onToggle={(addOn, selected) => {
            setAddOns((prev) => prev.map((item) => (item.id === addOn.id ? { ...item, selected } : item)));
            toast.show(`${addOn.label} ${selected ? 'added' : 'removed'}`);
          }}
          onQuantityChange={(addOn, quantity) =>
            setAddOns((prev) => prev.map((item) => (item.id === addOn.id ? { ...item, quantity } : item)))
          }
          testID="addons"
        />

        <Divider style={{ marginVertical: theme.spacing.sm }} />
        <MoneyRow label="Add-ons total" value={{ minorUnits: total, currency: 'INR' }} emphasis="total" testID="addons-total" />
      </AppCard>
    </ScrollView>
  );
};
