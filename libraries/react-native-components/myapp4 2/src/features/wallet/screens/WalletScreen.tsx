import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { List, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';

import {
  AmountKeypadUsage,
  BalanceCardUsage,
  CardVisualUsage,
  EMICalculatorUsage,
  KYCUploaderUsage,
  PayeeSelectorUsage,
  PaymentMethodSelectorUsage,
  PinPadUsage,
  SpendingCategoryChartUsage,
  StatementFilterSheetUsage,
  TransactionListItemUsage,
  TransactionStatusSheetUsage,
} from '@ui/fintech';

interface Entry {
  key: string;
  title: string;
  description: string;
  Component: React.ComponentType;
}

/**
 * Live gallery for the fintech library.
 *
 * Each entry renders that component's own `*.usage.tsx` — the same file that
 * documents it. There is no second copy of the examples to fall out of date.
 */
const ENTRIES: Entry[] = [
  { key: 'balance', title: 'BalanceCard', description: 'Masking, stale data, offline, locked, multi-currency', Component: BalanceCardUsage },
  { key: 'transactions', title: 'TransactionListItem', description: 'Date grouping, pending explanations, swipe actions', Component: TransactionListItemUsage },
  { key: 'amount', title: 'AmountKeypad', description: 'Minor-unit entry, JPY/USD/INR, live fee recalculation', Component: AmountKeypadUsage },
  { key: 'pin', title: 'PinPad / BiometricPrompt', description: 'Auth state machine, lockout, step-up, recovery', Component: PinPadUsage },
  { key: 'methods', title: 'PaymentMethodSelector', description: 'Fees, delivery estimates, disabled reasons', Component: PaymentMethodSelectorUsage },
  { key: 'cards', title: 'CardVisual', description: 'Freeze, statuses, and the separated credential panel', Component: CardVisualUsage },
  { key: 'payees', title: 'PayeeSelector', description: 'Search adapters, duplicate names, final confirmation', Component: PayeeSelectorUsage },
  { key: 'status', title: 'TransactionStatusSheet', description: 'processing → pending → completed, honestly labelled', Component: TransactionStatusSheetUsage },
  { key: 'kyc', title: 'KYCUploader', description: 'Guided capture, actionable errors, manual review', Component: KYCUploaderUsage },
  { key: 'spending', title: 'SpendingCategoryChart', description: 'Donut, trend bars, and an accessible data table', Component: SpendingCategoryChartUsage },
  { key: 'emi', title: 'EMICalculator', description: 'Pure loan engine, lender adapter, amortization', Component: EMICalculatorUsage },
  { key: 'filters', title: 'StatementFilterSheet', description: 'Serializable filters, result counts, summary chips', Component: StatementFilterSheetUsage },
];

export const WalletScreen = () => {
  const theme = useAppTheme();
  const [active, setActive] = useState<string | null>(null);

  const entry = useMemo(() => ENTRIES.find((e) => e.key === active), [active]);

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
            style={{ color: theme.colors.primary }}
            accessibilityRole="button"
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
        title="Fintech component library"
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
            testID={`fintech-entry-${item.key}`}
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
