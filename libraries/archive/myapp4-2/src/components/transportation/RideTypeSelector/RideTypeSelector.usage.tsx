/**
 * USAGE — RideTypeSelector
 *
 * The wheelchair-accessible option stays in the list with "No cars nearby"
 * instead of disappearing — a rider needing it should never wonder if it was
 * ever offered.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RideOption } from '../types/domain';
import { RideTypeSelector } from './RideTypeSelector';
import sample from './RideTypeSelector.sample.json';

const { options } = loadSample<{ options: RideOption[] }>(sample);

export const RideTypeSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState('rt-1');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View>
        <Text variant="titleSmall" style={{ marginBottom: theme.spacing.sm }}>
          Horizontal (mobile)
        </Text>
        <RideTypeSelector
          options={options}
          selectedId={selectedId}
          onSelect={(item) => {
            setSelectedId(item.id);
            toast.show(`Selected ${item.name}`);
          }}
          onViewDetails={(item) => toast.show(`Opening details for ${item.name}`)}
        />
      </View>

      <View>
        <Text variant="titleSmall" style={{ marginBottom: theme.spacing.sm }}>
          Vertical (accessibility / desktop fallback)
        </Text>
        <RideTypeSelector options={options} selectedId={selectedId} orientation="vertical" onSelect={(item) => setSelectedId(item.id)} />
      </View>
    </ScrollView>
  );
};
