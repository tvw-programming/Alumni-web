/**
 * USAGE — LocalityInsightsCard
 *
 * Every insight states its distance and, where relevant, its data source and
 * freshness — never a bare claim of proximity with no method behind it.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LocalityInsight, PriceTrendSummary } from '../types/domain';
import { LocalityInsightsCard } from './LocalityInsightsCard';
import sample from './LocalityInsightsCard.sample.json';

const data = loadSample<{ localityName: string; priceTrend: PriceTrendSummary; insights: LocalityInsight[] }>(sample);

export const LocalityInsightsCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <LocalityInsightsCard localityName={data.localityName} insights={data.insights} priceTrend={data.priceTrend} onViewLocality={() => toast.show(`Opening ${data.localityName} report`)} />
    </ScrollView>
  );
};
