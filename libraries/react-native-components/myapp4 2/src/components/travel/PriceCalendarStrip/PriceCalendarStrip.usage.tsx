/**
 * USAGE — PriceCalendarStrip
 *
 * "Cheapest" and "High demand" both pair a trend icon with a text label —
 * neither relies on colour alone to make its point.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { CalendarPrice } from '../types/domain';
import { PriceCalendarStrip } from './PriceCalendarStrip';
import sample from './PriceCalendarStrip.sample.json';

const { prices } = loadSample<{ prices: CalendarPrice[] }>(sample);

export const PriceCalendarStripUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selected, setSelected] = useState('2026-08-22');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      <Text variant="titleSmall">Choose your dates</Text>
      <PriceCalendarStrip
        prices={prices}
        selectedDate={selected}
        onSelect={setSelected}
        onTrackPrice={() => toast.success('Tracking prices for this route')}
      />
    </ScrollView>
  );
};
