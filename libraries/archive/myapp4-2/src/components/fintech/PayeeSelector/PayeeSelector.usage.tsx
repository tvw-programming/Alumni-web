/**
 * USAGE — PayeeSelector + PayeeConfirmation
 *
 * The full two-stage flow: discover/search, then confirm against the exact
 * identifier before any money moves.
 */
import React, { useCallback, useMemo, useState } from 'react';
import { View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import { money } from '../types/money';
import type { Payee } from '../types/domain';
import { PayeeSelector, type PayeeSearchAdapter } from './PayeeSelector';
import { PayeeConfirmation } from './PayeeConfirmation';
import sample from './PayeeSelector.sample.json';

const { directory, recentIds, favoriteIds } = loadSample<{
  directory: Payee[];
  recentIds: string[];
  favoriteIds: string[];
}>(sample);

export const PayeeSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [chosen, setChosen] = useState<Payee | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recents = useMemo(() => directory.filter((p) => recentIds.includes(p.id)), []);
  const favorites = useMemo(() => directory.filter((p) => favoriteIds.includes(p.id)), []);

  /** Local adapter searches the cached directory; remote simulates a lookup. */
  const adapter = useMemo<PayeeSearchAdapter>(
    () => ({
      local: (query) => {
        const q = query.toLowerCase();
        return directory.filter(
          (payee) =>
            payee.displayName.toLowerCase().includes(q) ||
            payee.identifiers.some((id) => id.value.toLowerCase().includes(q)),
        );
      },
      remote: async (query) => {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (!query.startsWith('@')) return [];
        return [
          {
            id: `remote-${query}`,
            displayName: 'New contact',
            identifiers: [{ kind: 'handle' as const, value: query }],
            verification: 'unverified' as const,
            type: 'person' as const,
          },
        ];
      },
    }),
    [],
  );

  const handleConfirm = useCallback(async () => {
    setSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 900));
    setSubmitting(false);
    toast.success(`Sent to ${chosen?.identifiers[0]?.value}`);
    setChosen(null);
  }, [chosen, toast]);

  if (chosen) {
    return (
      <View style={{ flex: 1, padding: theme.spacing.md }}>
        <PayeeConfirmation
          payee={chosen}
          amount={money(1250000, 'INR')}
          submitting={submitting}
          onConfirm={() => void handleConfirm()}
          onEdit={() => setChosen(null)}
          testID="payee-confirm"
        />
      </View>
    );
  }

  return (
    <PayeeSelector
      adapter={adapter}
      recents={recents}
      favorites={favorites}
      mode="single"
      contactPermission="denied"
      onRequestContactPermission={() => toast.show('Requesting contacts permission')}
      onChange={(_ids, payees) => setChosen(payees[0] ?? null)}
      onAddNewPayee={() => toast.show('Opening new payee form')}
      onScanQR={() => toast.show('Opening QR scanner')}
      testID="payee-selector"
    />
  );
};
