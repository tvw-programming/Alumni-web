import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { SoilHealthCard } from './SoilHealthCard';
import sample from './SoilHealthCard.sample.json';
import { loadSample } from '../types/sample';
import type { SoilReport } from '../types/domain';

const DATA = loadSample<{ reports: SoilReport[]; disclaimer: string }>(sample);

export const SoilHealthCardUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {DATA.reports.map((report) => (
        <View key={report.fieldName}>
          <SoilHealthCard
            report={report}
            disclaimer={report.status === 'available' ? DATA.disclaimer : undefined}
            onViewDetails={() => {}}
            onRequestTest={() => {}}
          />
        </View>
      ))}
    </ScrollView>
  );
};
