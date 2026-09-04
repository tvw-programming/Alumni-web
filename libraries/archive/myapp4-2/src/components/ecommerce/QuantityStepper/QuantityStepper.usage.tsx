/**
 * USAGE — QuantityStepper
 *
 * Includes the optimistic-update-with-rollback pattern, which is what a real
 * cart needs: apply locally, confirm with the server, revert on failure.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { QuantityStepper, type QuantityStepperProps } from './QuantityStepper';
import sample from './QuantityStepper.sample.json';

const { configs } = loadSample<{ configs: Record<string, QuantityStepperProps> }>(sample);

export const QuantityStepperUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [quantity, setQuantity] = useState(2);
  const [syncState, setSyncState] = useState<'idle' | 'loading' | 'error'>('idle');

  /** Optimistic update, rolled back if the server rejects it. */
  const handleChange = useCallback(
    async (next: number) => {
      const previous = quantity;
      setQuantity(next);
      setSyncState('loading');

      await new Promise((resolve) => setTimeout(resolve, 600));

      if (next === 7) {
        setQuantity(previous);
        setSyncState('error');
        toast.error('Could not update quantity — reverted');
        return;
      }
      setSyncState('idle');
    },
    [quantity, toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelLarge">Cart stepper with optimistic update (set it to 7 to see a rollback)</Text>
      <QuantityStepper
        value={quantity}
        onChange={(next) => void handleChange(next)}
        min={1}
        max={10}
        step={1}
        itemLabel="Coffee beans"
        variant="cart"
        size="md"
        updateState={syncState}
        allowDirectEntry
        onRemove={() => toast.show('Removed from cart')}
        onLimitReached={(reason) => toast.warning(reason)}
        testID="qty-cart"
      />

      <Divider />

      {Object.entries(configs).map(([key, config]) => (
        <View key={key} style={{ gap: theme.spacing.xs }}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {key} — {config.itemLabel}
          </Text>
          <QuantityStepper
            {...config}
            defaultValue={config.min}
            onLimitReached={(reason) => toast.warning(reason)}
            testID={`qty-${key}`}
          />
        </View>
      ))}

      <Text variant="labelLarge">Sizes</Text>
      <View style={{ flexDirection: 'row', gap: theme.spacing.md, alignItems: 'center' }}>
        <QuantityStepper defaultValue={1} min={1} max={9} step={1} size="sm" itemLabel="Item" />
        <QuantityStepper defaultValue={1} min={1} max={9} step={1} size="md" itemLabel="Item" />
        <QuantityStepper defaultValue={1} min={1} max={9} step={1} size="lg" itemLabel="Item" />
      </View>
    </ScrollView>
  );
};
