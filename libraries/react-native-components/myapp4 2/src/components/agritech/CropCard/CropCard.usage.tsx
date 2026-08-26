import React from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';

import { CropCard } from './CropCard';
import sample from './CropCard.sample.json';
import { loadSample } from '../types/sample';
import type { Crop } from '../types/domain';

const CROPS = loadSample<{ crops: Crop[] }>(sample).crops;

export const CropCardUsage = () => {
  const theme = useAppTheme();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
      {CROPS.map((crop) => (
        <View key={crop.id}>
          <CropCard crop={crop} onPress={() => {}} onViewAdvisory={() => {}} onConfirmStage={() => {}} />
        </View>
      ))}
    </ScrollView>
  );
};
