import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { VehicleTrackingCard } from './VehicleTrackingCard';
import sample from './VehicleTrackingCard.sample.json';
import { loadSample } from '../types/sample';
import type { VehicleTracking } from '../types/domain';

const VEHICLES = loadSample<{ vehicles: VehicleTracking[] }>(sample).vehicles;

export const VehicleTrackingCardUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {VEHICLES.map((vehicle) => (
        <View key={vehicle.id}>
          <VehicleTrackingCard vehicle={vehicle} onExpandMap={() => {}} onCall={() => {}} onChat={() => {}} onSupport={() => {}} />
        </View>
      ))}
    </ScrollView>
  );
};
