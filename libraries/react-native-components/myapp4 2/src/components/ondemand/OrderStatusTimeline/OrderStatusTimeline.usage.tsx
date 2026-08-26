/**
 * USAGE — OrderStatusTimeline
 *
 * The "delayed" scenario deliberately shows a stale-data banner with a
 * timestamp instead of a ticking ETA countdown once the feed has gone quiet.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { OrderStatusStep } from '../types/domain';
import { OrderStatusTimeline } from './OrderStatusTimeline';
import rawSample from './OrderStatusTimeline.sample.json';

type Scenario = { steps: OrderStatusStep[]; lastUpdatedLabel?: string; stale?: boolean };
const sample = loadSample<Record<'inProgress' | 'delayed' | 'failed' | 'canceled' | 'completed', Scenario>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'inProgress', label: 'In progress' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'failed', label: 'Failed' },
  { value: 'canceled', label: 'Canceled' },
  { value: 'completed', label: 'Completed' },
];

export const OrderStatusTimelineUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('inProgress');

  const data = sample[scenario];
  const steps = data.steps.map((step) => (step.onAction === null ? { ...step, onAction: () => toast.show(step.actionLabel ?? 'Action') } : step));

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <SegmentedButtons
        value={scenario}
        onValueChange={(v) => setScenario(v as keyof typeof sample)}
        buttons={SCENARIOS.map((s) => ({ value: s.value, label: s.label }))}
      />
      <View>
        <Text variant="titleMedium" style={{ marginBottom: theme.spacing.md }}>
          Order status
        </Text>
        <OrderStatusTimeline steps={steps} lastUpdatedLabel={data.lastUpdatedLabel} stale={data.stale} />
      </View>
    </ScrollView>
  );
};
