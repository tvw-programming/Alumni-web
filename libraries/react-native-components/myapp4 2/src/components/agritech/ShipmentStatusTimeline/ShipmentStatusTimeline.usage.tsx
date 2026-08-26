import React from 'react';
import { ScrollView } from 'react-native';

import { useAppTheme } from '@/theme';

import { ShipmentStatusTimeline } from './ShipmentStatusTimeline';
import sample from './ShipmentStatusTimeline.sample.json';
import { loadSample } from '../types/sample';
import type { ShipmentEvent } from '../types/domain';

const DATA = loadSample<{ currentStatus: string; events: ShipmentEvent[] }>(sample);

export const ShipmentStatusTimelineUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <ShipmentStatusTimeline events={DATA.events} currentStatus={DATA.currentStatus} onEventPress={() => {}} onSupport={() => {}} />
    </ScrollView>
  );
};
