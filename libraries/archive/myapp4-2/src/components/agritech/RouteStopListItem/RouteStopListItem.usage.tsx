import React from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { RouteStopListItem } from './RouteStopListItem';
import sample from './RouteStopListItem.sample.json';
import { loadSample } from '../types/sample';
import type { RouteStop } from '../types/domain';

const DATA = loadSample<{ stops: RouteStop[]; totalStops: number }>(sample);

export const RouteStopListItemUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {DATA.stops.map((stop, i) => (
        <React.Fragment key={stop.id}>
          <RouteStopListItem stop={stop} totalStops={DATA.totalStops} onPress={() => {}} onNavigate={() => {}} onStartStop={() => {}} onAddProof={() => {}} />
          {i < DATA.stops.length - 1 ? <Divider style={{ marginVertical: 4 }} /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
