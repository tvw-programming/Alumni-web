/**
 * USAGE — TransactionStatusSheet
 *
 * Includes the realistic case: a payment that starts as `processing`, becomes
 * `pending`, and only later resolves. The backend is the source of truth; the
 * sheet just re-renders.
 */
import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { TransactionResult } from '../types/domain';
import { TransactionStatusSheet } from './TransactionStatusSheet';
import sample from './TransactionStatusSheet.sample.json';

const { results } = loadSample<{ results: Record<string, TransactionResult> }>(sample);

export const TransactionStatusSheetUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [active, setActive] = useState<TransactionResult | null>(null);

  /** Simulates polling: processing → pending → success. */
  const runRealisticFlow = useCallback(() => {
    setActive(results.processing!);
    setTimeout(() => setActive(results.pending!), 1600);
    setTimeout(() => setActive(results.success!), 3600);
  }, []);

  const actionsFor = useCallback(
    (result: TransactionResult) => {
      if (result.status === 'failed' || result.status === 'declined') {
        return [
          { key: 'retry', label: 'Try again', onPress: () => toast.show('Retrying') },
          { key: 'support', label: 'Contact support', onPress: () => toast.show('Opening support') },
        ];
      }
      if (result.status === 'processing') return [];
      return [
        { key: 'done', label: 'Done', onPress: () => setActive(null) },
        { key: 'receipt', label: 'Share receipt', onPress: () => toast.show('Sharing receipt') },
      ];
    },
    [toast],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <Text variant="bodyMedium">
        Note how "Payment submitted" (pending) and "Payment completed" (success) are different screens.
      </Text>

      <AppButton variant="primary" fullWidth onPress={runRealisticFlow}>
        Realistic flow: processing → pending → completed
      </AppButton>

      {Object.entries(results).map(([key, result]) => (
        <AppButton
          key={key}
          variant={result.status === 'failed' || result.status === 'declined' ? 'danger' : 'secondary'}
          fullWidth
          onPress={() => setActive(result)}
        >
          {key}
        </AppButton>
      ))}

      {active ? (
        <TransactionStatusSheet
          visible
          result={active}
          nextActions={actionsFor(active)}
          onDismiss={() => setActive(null)}
          testID="txn-status"
        />
      ) : null}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
