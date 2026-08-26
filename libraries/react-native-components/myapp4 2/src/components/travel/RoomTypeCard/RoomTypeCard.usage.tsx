/**
 * USAGE — RoomTypeCard
 *
 * The two "Deluxe Room, Garden View" entries are different rate plans on the
 * same room — each renders as its own selectable row rather than collapsing
 * into one card with a hidden rate switch.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { useToast } from '@ui/providers/ToastProvider';

import { loadSample } from '../types/sample';
import type { RoomRate } from '../types/domain';
import { RoomTypeCard } from './RoomTypeCard';
import sample from './RoomTypeCard.sample.json';

const { rooms } = loadSample<{ rooms: RoomRate[] }>(sample);

export const RoomTypeCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState('rm-1');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <View accessibilityRole="radiogroup" accessibilityLabel="Choose a room" style={{ gap: theme.spacing.sm }}>
        {rooms.map((room) => (
          <RoomTypeCard
            key={room.id}
            room={room}
            selected={selectedId === room.id}
            onSelect={(item) => {
              setSelectedId(item.id);
              toast.show(`Selected ${item.roomName}`);
            }}
          />
        ))}
      </View>
    </ScrollView>
  );
};
