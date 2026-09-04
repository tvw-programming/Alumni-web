/**
 * USAGE — KPIStatCard
 *
 * "Churn rate" is up 8% but coloured negative, while "Open support tickets"
 * is down 15% but coloured positive — "up" is never assumed to be good, the
 * semantic status always drives the colour.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { KPIStat } from '../types/domain';
import { KPIStatCard } from './KPIStatCard';
import sample from './KPIStatCard.sample.json';

const { stats } = loadSample<{ stats: KPIStat[] }>(sample);

export const KPIStatCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {stats.map((stat) => (
          <View key={stat.label} style={{ width: '47%' }}>
            <KPIStatCard stat={stat} onPress={() => toast.show(`Opening ${stat.label} report`)} />
          </View>
        ))}
      </View>

      <KPIStatCard stat={stats[0]!} loading containerStyle={{ marginTop: theme.spacing.md }} />
      <KPIStatCard stat={stats[0]!} error="Metric unavailable" containerStyle={{ marginTop: theme.spacing.md }} />
    </ScrollView>
  );
};
