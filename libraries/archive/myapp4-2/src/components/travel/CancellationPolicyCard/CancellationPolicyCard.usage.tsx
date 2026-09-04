/**
 * USAGE — CancellationPolicyCard
 *
 * Every "free cancellation" summary carries its deadline and local time zone
 * right next to it — never a bare "Flexible cancellation" claim.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CancellationPolicy } from '../types/domain';
import { CancellationPolicyCard } from './CancellationPolicyCard';
import sample from './CancellationPolicyCard.sample.json';

const { policies } = loadSample<{ policies: CancellationPolicy[] }>(sample);

export const CancellationPolicyCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {policies.map((policy, index) => (
        <CancellationPolicyCard
          key={index}
          policy={policy}
          defaultExpanded={index === 0}
          onViewFullPolicy={() => toast.show('Opening full cancellation policy')}
        />
      ))}
    </ScrollView>
  );
};
