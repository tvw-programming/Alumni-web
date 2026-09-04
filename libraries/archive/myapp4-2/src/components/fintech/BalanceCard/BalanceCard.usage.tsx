/**
 * USAGE — BalanceCard
 *
 * Every variant, driven by `BalanceCard.sample.json`. This file compiles, so the
 * examples cannot drift from the component's real props.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { useToast } from '@ui/providers/ToastProvider';

import { loadSample } from '../types/sample';
import { BalanceCard, type BalanceCardProps } from './BalanceCard';
import sample from './BalanceCard.sample.json';

const samples = loadSample<Record<string, BalanceCardProps>>(sample);

export const BalanceCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);

  // Actions are passed in, never hard-coded — the card renders intent, the
  // screen owns the behaviour.
  const actions = [
    { key: 'send', label: 'Send', icon: 'arrow-top-right', onPress: () => toast.show('Send') },
    { key: 'add', label: 'Add money', icon: 'plus', onPress: () => toast.show('Add money') },
    { key: 'exchange', label: 'Exchange', icon: 'swap-horizontal', onPress: () => toast.show('Exchange') },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelLarge">1. Default — masked by default, tap the eye to reveal</Text>
      <BalanceCard {...samples.default!} actions={actions} onPress={() => toast.show('Open account')} testID="balance-default" />

      <Text variant="labelLarge">2. Hero — the dashboard headline</Text>
      <BalanceCard {...samples.hero!} actions={actions.slice(0, 2)} testID="balance-hero" />

      <Text variant="labelLarge">3. Negative / overdraft — colour is NOT the only cue</Text>
      <BalanceCard {...samples.negative!} testID="balance-negative" />

      <Text variant="labelLarge">4. Multi-currency — second amount in the home currency</Text>
      <BalanceCard {...samples.multiCurrency!} locale="en-US" testID="balance-multi" />

      <Text variant="labelLarge">5. Locked — KYC incomplete, balance withheld</Text>
      <BalanceCard {...samples.locked!} testID="balance-locked" />

      <Text variant="labelLarge">6. Offline — cached value plus its timestamp</Text>
      <BalanceCard
        {...samples.offline!}
        onRefresh={() => {
          setRefreshing(true);
          setTimeout(() => setRefreshing(false), 800);
        }}
        onRetry={() => toast.show('Retrying')}
        testID="balance-offline"
      />

      <Text variant="labelLarge">7. Loading skeleton</Text>
      <BalanceCard {...samples.default!} status={refreshing ? 'loading' : 'loading'} testID="balance-skeleton" />

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
