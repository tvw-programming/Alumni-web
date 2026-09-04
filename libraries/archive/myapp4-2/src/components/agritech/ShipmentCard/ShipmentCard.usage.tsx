import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { ShipmentCard } from './ShipmentCard';
import sample from './ShipmentCard.sample.json';
import { loadSample } from '../types/sample';
import type { Shipment } from '../types/domain';

const SHIPMENTS = loadSample<{ shipments: Shipment[] }>(sample).shipments;

export const ShipmentCardUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {SHIPMENTS.map((shipment) => (
        <View key={shipment.id}>
          <ShipmentCard shipment={shipment} onPress={() => {}} onContactSupport={() => {}} />
        </View>
      ))}
    </ScrollView>
  );
};
