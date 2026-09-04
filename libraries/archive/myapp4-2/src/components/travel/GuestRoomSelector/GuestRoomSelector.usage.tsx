/**
 * USAGE — GuestRoomSelector
 *
 * Exceeding a room's typical capacity surfaces a warning and a suggestion —
 * it never silently adds a room on the traveler's behalf.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { GuestRoomSelection, OccupancyRules } from '../types/domain';
import { GuestRoomSelector } from './GuestRoomSelector';
import rawSample from './GuestRoomSelector.sample.json';

const sample = loadSample<{ value: GuestRoomSelection; rules: OccupancyRules }>(rawSample);

export const GuestRoomSelectorUsage = () => {
  const theme = useAppTheme();
  const [selection, setSelection] = useState<GuestRoomSelection>(sample.value);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="bodyMedium">
        {selection.adults + selection.children} guest{selection.adults + selection.children === 1 ? '' : 's'}, {selection.rooms} room
        {selection.rooms === 1 ? '' : 's'}
      </Text>
      <GuestRoomSelector value={selection} onChange={setSelection} rules={sample.rules} showPets />
    </ScrollView>
  );
};
