import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Badge, SegmentedButtons, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { RoomTab } from '../types/domain';

export interface RoomTabsProps extends StyleEscapeHatches {
  rooms: RoomTab[];
  selectedRoomId: string;
  variant?: 'segmented' | 'chips';
  onChange: (roomId: string) => void;
}

/**
 * Selection and query logic stay separate — this component only ever emits
 * `onChange(roomId)`; the parent screen owns fetching that room's devices.
 * Alert counts render as real text next to the room name, never a bare
 * badge with no explanation.
 */
export const RoomTabs = ({ rooms, selectedRoomId, variant, onChange, style, containerStyle, testID }: RoomTabsProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? 'room-tabs';
  const resolvedVariant = variant ?? (rooms.length <= 4 ? 'segmented' : 'chips');

  if (resolvedVariant === 'segmented') {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <SegmentedButtons value={selectedRoomId} onValueChange={onChange} buttons={rooms.map((r) => ({ value: r.id, label: r.alertCount ? `${r.label} (${r.alertCount})` : r.label }))} />
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[{ gap: 8 }, containerStyle]} style={style} testID={id}>
      {rooms.map((room) => {
        const selected = room.id === selectedRoomId;
        return (
          <TouchableRipple
            key={room.id}
            onPress={() => onChange(room.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${room.label}${room.deviceCount != null ? `, ${room.deviceCount} devices` : ''}${room.alertCount ? `, ${room.alertCount} alerts` : ''}`}
            style={[styles.chip, { borderRadius: theme.radii.pill, backgroundColor: selected ? iot.colors.primary : iot.colors.surfaceVariant }]}
            testID={childTestID(id, room.id)}
          >
            <View style={styles.row}>
              <Text variant="labelMedium" style={{ color: selected ? theme.colors.onPrimary : iot.colors.onSurface }}>
                {room.label}
                {room.deviceCount != null ? ` (${room.deviceCount})` : ''}
              </Text>
              {room.alertCount ? (
                <Badge size={16} style={{ backgroundColor: iot.colors.error, marginLeft: 6 }}>
                  {room.alertCount}
                </Badge>
              ) : null}
            </View>
          </TouchableRipple>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
