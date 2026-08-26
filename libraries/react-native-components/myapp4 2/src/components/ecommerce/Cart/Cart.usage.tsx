/**
 * USAGE — CartLineItem + CartSummaryCard
 *
 * A working cart: quantity edits recompute the line and the summary, removal is
 * undoable, and an out-of-stock line blocks checkout with a stated reason.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { StateView } from '@ui/molecules/StateView';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CartLine, CartTotals } from '../types/domain';
import { CartLineItem } from './CartLineItem';
import { CartSummaryCard } from './CartSummaryCard';
import sample from './Cart.sample.json';

const initial = loadSample<{ lines: CartLine[]; totals: CartTotals; emptyTotals: CartTotals }>(sample);

export const CartUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [lines, setLines] = useState<CartLine[]>(initial.lines);

  /**
   * Client-side recompute for the demo only. In production the checkout API
   * recalculates totals authoritatively before payment.
   */
  const totals = useMemo<CartTotals>(() => {
    const subtotal = lines
      .filter((line) => line.availability !== 'outOfStock')
      .reduce((sum, line) => sum + line.unitPrice.minorUnits * line.quantity.value, 0);
    return {
      ...initial.totals,
      subtotal: { minorUnits: Math.round(subtotal), currency: 'INR' },
      total: {
        minorUnits: Math.round(
          subtotal -
            (initial.totals.discounts?.minorUnits ?? 0) +
            (initial.totals.serviceFee?.minorUnits ?? 0) +
            (initial.totals.tax?.minorUnits ?? 0) -
            (initial.totals.credits?.minorUnits ?? 0),
        ),
        currency: 'INR',
      },
    };
  }, [lines]);

  const changeQuantity = useCallback((line: CartLine, next: number) => {
    setLines((prev) =>
      prev.map((item) =>
        item.id === line.id
          ? {
              ...item,
              quantity: { ...item.quantity, value: next, updateState: 'idle' },
              lineTotal: { minorUnits: Math.round(item.unitPrice.minorUnits * next), currency: item.unitPrice.currency },
            }
          : item,
      ),
    );
  }, []);

  const remove = useCallback(
    (line: CartLine) => {
      setLines((prev) => prev.filter((item) => item.id !== line.id));
      toast.show(`${line.title.slice(0, 20)}… removed`, {
        action: { label: 'Undo', onPress: () => setLines((prev) => [...prev, line]) },
      });
    },
    [toast],
  );

  const blocked = lines.some((line) => line.availability === 'outOfStock');

  if (lines.length === 0) {
    return (
      <StateView
        preset="empty"
        title="Your cart is empty"
        description="Items you add will appear here."
        primaryAction={{ label: 'Restore demo cart', onPress: () => setLines(initial.lines) }}
        testID="cart-empty"
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={{ paddingBottom: theme.spacing.xl }}>
      {lines.map((line, index) => (
        <CartLineItem
          key={line.id}
          line={line}
          index={index}
          entering="slideUp"
          onQuantityChange={changeQuantity}
          onRemove={remove}
          onSaveForLater={() => toast.show('Saved for later')}
          onChooseSubstitution={() => toast.show('Opening replacement options')}
          onPress={() => toast.show('Opening product')}
        />
      ))}

      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <CartSummaryCard
          totals={totals}
          itemCount={lines.length}
          variant="full"
          onCheckout={() => toast.success('Proceeding to checkout')}
          checkoutDisabled={blocked}
          checkoutDisabledReason="Remove the out-of-stock item to continue"
          footerSlot={
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Delivery is free on this order. Fees and tax shown above are included in the total.
            </Text>
          }
          testID="cart-summary"
        />

        <Text variant="labelLarge">Collapsible variant (mobile checkout)</Text>
        <CartSummaryCard totals={totals} variant="collapsible" itemCount={lines.length} testID="cart-summary-collapsed" />

        <Text variant="labelLarge">Loading</Text>
        <CartSummaryCard loading testID="cart-summary-loading" />
      </View>
    </ScrollView>
  );
};
