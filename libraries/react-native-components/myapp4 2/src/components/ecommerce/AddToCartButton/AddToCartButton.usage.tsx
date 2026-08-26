/**
 * USAGE — AddToCartButton
 *
 * The live example runs a real add sequence: idle → loading → added, with the
 * stepper taking over once the item is in the cart.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { AddToCartState, QuantityConfig } from '../types/domain';
import { AddToCartButton } from './AddToCartButton';
import sample from './AddToCartButton.sample.json';

interface SampleState {
  state: AddToCartState;
  itemLabel: string;
  note: string;
  errorMessage?: string;
  quantity?: QuantityConfig;
}

const { states } = loadSample<{ states: SampleState[] }>(sample);

export const AddToCartButtonUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [live, setLive] = useState<AddToCartState>('idle');
  const [quantity, setQuantity] = useState(1);

  /** The caller owns the mutation and reports back the resulting state. */
  const handleAdd = useCallback(async () => {
    setLive('loading');
    await new Promise((resolve) => setTimeout(resolve, 900));
    setLive('added');
    toast.success('Added to cart', { action: { label: 'Undo', onPress: () => setLive('idle') } });
  }, [toast]);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelLarge">Live flow — becomes a stepper once added</Text>
      <AddToCartButton
        state={live}
        productId="p-1"
        itemLabel="Aurora Running Shoes"
        variant="withStepper"
        quantity={{ value: quantity, min: 1, max: 5, step: 1 }}
        onQuantityChange={setQuantity}
        onAdd={() => void handleAdd()}
        onViewCart={() => toast.show('Opening cart')}
        testID="atc-live"
      />

      <Text variant="labelLarge">Split action (Add + Buy now)</Text>
      <AddToCartButton
        state="idle"
        productId="p-1"
        itemLabel="Aurora Running Shoes"
        variant="split"
        onAdd={() => toast.show('Added')}
        onBuyNow={() => toast.show('Going straight to checkout')}
        testID="atc-split"
      />

      <Divider />

      {states.map((item) => (
        <View key={item.state} style={{ gap: theme.spacing.xs }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {item.state} — {item.note}
          </Text>
          <AddToCartButton
            state={item.state}
            productId="p-1"
            itemLabel={item.itemLabel}
            quantity={item.quantity}
            errorMessage={item.errorMessage}
            onAdd={() => toast.show('Add requested')}
            onChooseOptions={() => toast.warning('Opening the size selector')}
            onNotifyMe={() => toast.success('We will let you know')}
            onRetry={() => toast.show('Retrying')}
            onViewCart={() => toast.show('Opening cart')}
            testID={`atc-${item.state}`}
          />
        </View>
      ))}
    </ScrollView>
  );
};
