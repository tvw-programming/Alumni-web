/**
 * USAGE — RoomTabs
 *
 * "Garage" carries a real alert badge and count text — the tab never just
 * looks different, it says how many devices need attention.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RoomTab } from '../types/domain';
import { RoomTabs } from './RoomTabs';
import sample from './RoomTabs.sample.json';

const { fewRooms, manyRooms } = loadSample<{ fewRooms: RoomTab[]; manyRooms: RoomTab[] }>(sample);

export const RoomTabsUsage = () => {
  const theme = useAppTheme();
  const [selectedFew, setSelectedFew] = useState('r-all');
  const [selectedMany, setSelectedMany] = useState('r-all');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Segmented (few rooms)
        </Text>
        <RoomTabs rooms={fewRooms} selectedRoomId={selectedFew} onChange={setSelectedFew} />
      </View>

      <View>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: 8 }}>
          Chips (many rooms)
        </Text>
        <RoomTabs rooms={manyRooms} selectedRoomId={selectedMany} onChange={setSelectedMany} />
      </View>
    </ScrollView>
  );
};
