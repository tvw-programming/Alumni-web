/**
 * USAGE — PaymentMethodSelector
 *
 * The important part is the recap at the bottom: fee, total and delivery
 * estimate recalculate when the method changes, and the caller owns that math.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Divider, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { addMoney, formatMoney, money } from '../types/money';
import type { PaymentMethod } from '../types/domain';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import sample from './PaymentMethodSelector.sample.json';

const { methods } = loadSample<{ methods: PaymentMethod[] }>(sample);

const AMOUNT = money(1250000, 'INR');

export const PaymentMethodSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selected, setSelected] = useState<string[]>(['pm-balance']);

  const active = useMemo(() => methods.find((m) => m.id === selected[0]), [selected]);

  /** Recalculated on every method change — never silently stale. */
  const total = useMemo(
    () => (active?.fee ? addMoney(AMOUNT, active.fee) : AMOUNT),
    [active],
  );

  const handleChange = useCallback(
    (next: string[]) => {
      setSelected(next);
      const method = methods.find((m) => m.id === next[0]);
      if (method) toast.show(`Paying with ${method.label}`);
    },
    [toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="titleMedium">Choose how to pay</Text>

      <PaymentMethodSelector
        methods={methods}
        selected={selected}
        onChange={handleChange}
        mode="singleSelect"
        presentation="card"
        onAddMethod={() => toast.show('Opening add-card flow')}
        testID="pm-selector"
      />

      <AppCard variant="filled" title="Summary">
        <View style={styles.row}>
          <Text variant="bodyMedium" style={styles.flex}>
            Amount
          </Text>
          <Text variant="bodyMedium">{formatMoney(AMOUNT)}</Text>
        </View>
        <View style={styles.row}>
          <Text variant="bodyMedium" style={styles.flex}>
            Fee
          </Text>
          <Text variant="bodyMedium">{active?.fee ? formatMoney(active.fee) : 'No fee'}</Text>
        </View>
        <Divider style={{ marginVertical: theme.spacing.sm }} />
        <View style={styles.row}>
          <Text variant="titleMedium" style={styles.flex}>
            Total
          </Text>
          <Text variant="titleMedium">{formatMoney(total)}</Text>
        </View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.xs }}>
          {active?.deliveryEstimate ? `Arrives: ${active.deliveryEstimate}` : 'Select a method to see delivery time'}
        </Text>
      </AppCard>

      <Text variant="titleMedium">Multi-select (e.g. split funding)</Text>
      <PaymentMethodSelector
        methods={methods.slice(0, 3)}
        defaultSelected={['pm-balance']}
        mode="multiSelect"
        presentation="list"
        testID="pm-selector-multi"
      />
    </ScrollView>
  );
};

const styles = {
  row: { flexDirection: 'row' as const, alignItems: 'center' as const },
  flex: { flex: 1 },
};
