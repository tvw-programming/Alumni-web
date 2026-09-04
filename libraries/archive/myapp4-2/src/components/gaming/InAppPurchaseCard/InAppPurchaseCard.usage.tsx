/**
 * USAGE — InAppPurchaseCard
 *
 * The purchase button shows "pending" until the host screen simulates a
 * server-confirmed receipt — the card never marks itself owned on the tap
 * alone.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PurchaseBundle, PurchaseFlowStatus } from '../types/domain';
import { InAppPurchaseCard } from './InAppPurchaseCard';
import sample from './InAppPurchaseCard.sample.json';

const { bundles, taxDisclosure } = loadSample<{ bundles: PurchaseBundle[]; taxDisclosure: string }>(sample);

export const InAppPurchaseCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [statuses, setStatuses] = useState<Record<string, PurchaseFlowStatus>>({});

  const handlePurchase = (bundle: PurchaseBundle) => {
    setStatuses((prev) => ({ ...prev, [bundle.id]: 'pending' }));
    setTimeout(() => {
      setStatuses((prev) => ({ ...prev, [bundle.id]: 'success' }));
      toast.success(`${bundle.title} purchased — receipt verified`);
    }, 1000);
  };

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {bundles.map((bundle) => (
        <InAppPurchaseCard
          key={bundle.id}
          bundle={bundle}
          purchaseStatus={statuses[bundle.id]}
          taxDisclosure={taxDisclosure}
          onPurchase={handlePurchase}
          onRestore={() => toast.show('Restoring purchases…')}
        />
      ))}
    </ScrollView>
  );
};
