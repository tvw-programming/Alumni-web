import React, { useState } from 'react';
import { View } from 'react-native';

import { useAppTheme } from '@/theme';

import { WeatherForecastStrip } from './WeatherForecastStrip';
import sample from './WeatherForecastStrip.sample.json';
import { loadSample } from '../types/sample';
import type { WeatherDay } from '../types/domain';

const DAYS = loadSample<{ days: WeatherDay[] }>(sample).days;

export const WeatherForecastStripUsage = () => {
  const theme = useAppTheme();
  const [selectedDate, setSelectedDate] = useState(DAYS[0]?.date);

  return (
    <View style={{ padding: theme.spacing.md }}>
      <WeatherForecastStrip
        days={DAYS}
        unit="C"
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
        updatedLabel="10 minutes ago"
        onViewDetails={() => {}}
      />
    </View>
  );
};
