import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { SensorReadingCard } from './SensorReadingCard';
import sample from './SensorReadingCard.sample.json';
import { loadSample } from '../types/sample';
import type { SensorReading } from '../types/domain';

const DATA = loadSample<{ readings: SensorReading[]; thresholdNote: string }>(sample);

export const SensorReadingCardUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {DATA.readings.map((reading) => (
        <View key={reading.label}>
          <SensorReadingCard reading={reading} thresholdNote={reading.status === 'critical' || reading.status === 'warning' ? DATA.thresholdNote : undefined} />
        </View>
      ))}
    </ScrollView>
  );
};
