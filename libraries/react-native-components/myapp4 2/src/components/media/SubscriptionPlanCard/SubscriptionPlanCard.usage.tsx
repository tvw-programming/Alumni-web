/**
 * USAGE — SubscriptionPlanCard
 *
 * "Start free trial" always ships with the disclosure of when billing
 * actually begins — the trial is never called free with no follow-up.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { SubscriptionPlan } from '../types/domain';
import { SubscriptionPlanCard } from './SubscriptionPlanCard';
import sample from './SubscriptionPlanCard.sample.json';

const { plans } = loadSample<{ plans: SubscriptionPlan[] }>(sample);

export const SubscriptionPlanCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState('plan-standard');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      {plans.map((plan) => (
        <SubscriptionPlanCard
          key={plan.id}
          plan={plan}
          selected={selectedId === plan.id}
          onSelect={(item) => setSelectedId(item.id)}
          onContinue={(item) => toast.show(item.trialLabel ? `Starting trial for ${item.name}` : `Subscribing to ${item.name}`)}
        />
      ))}
    </ScrollView>
  );
};
