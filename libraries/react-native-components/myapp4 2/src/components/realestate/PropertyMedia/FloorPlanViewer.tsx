import React, { useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Icon, IconButton, SegmentedButtons, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { Floor } from '../types/domain';

export interface FloorPlanViewerProps extends StyleEscapeHatches {
  floors: Floor[];
  selectedFloorId?: string;
  onSelectFloor?: (floorId: string) => void;
  onRoomPress?: (roomId: string) => void;
  onFullscreen?: () => void;
}

/**
 * Room discovery is never dependent on colour-coded polygons alone — every
 * floor also ships a plain text room list underneath the (optionally
 * interactive) image, so a screen reader gets the same rooms a sighted user
 * sees on the drawing.
 */
export const FloorPlanViewer = ({ floors, selectedFloorId, onSelectFloor, onRoomPress, onFullscreen, style, containerStyle, testID }: FloorPlanViewerProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'floor-plan-viewer';
  const [zoomed, setZoomed] = useState(false);

  const selected = floors.find((f) => f.id === selectedFloorId) ?? floors[0];

  if (!selected) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <Text variant="bodyMedium" style={{ color: realestate.colors.onSurfaceVariant }}>
          No floor plan available.
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      {floors.length > 1 ? (
        <SegmentedButtons
          value={selected.id}
          onValueChange={(v) => onSelectFloor?.(v)}
          buttons={floors.map((f) => ({ value: f.id, label: f.label }))}
          style={{ marginBottom: theme.spacing.sm }}
        />
      ) : (
        <Text variant="titleSmall" style={{ marginBottom: theme.spacing.sm }}>
          {selected.label}
        </Text>
      )}

      <View style={[styles.imageWrap, { backgroundColor: realestate.colors.surfaceVariant, borderRadius: theme.radii.md }]}>
        {selected.image?.uri ? (
          <ScrollView minimumZoomScale={1} maximumZoomScale={3} testID={childTestID(id, 'zoom-scroll')} onScrollBeginDrag={() => setZoomed(true)}>
            <Image source={{ uri: selected.image.uri }} style={styles.image} resizeMode="contain" accessibilityElementsHidden />
          </ScrollView>
        ) : (
          <View style={styles.fallback}>
            <Icon source="floor-plan" size={26} color={realestate.colors.onSurfaceVariant} />
            <Text variant="labelSmall" style={{ color: realestate.colors.onSurfaceVariant, marginTop: 4 }}>
              Floor plan image unavailable
            </Text>
          </View>
        )}

        <View style={styles.controlsRow}>
          {zoomed ? <IconButton icon="backup-restore" size={18} onPress={() => setZoomed(false)} accessibilityLabel="Reset zoom" containerColor="rgba(255,255,255,0.85)" style={styles.noMargin} /> : null}
          {onFullscreen ? <IconButton icon="fullscreen" size={18} onPress={onFullscreen} accessibilityLabel="View floor plan fullscreen" containerColor="rgba(255,255,255,0.85)" style={styles.noMargin} /> : null}
        </View>
      </View>

      {/* Text alternative to the interactive drawing */}
      {selected.rooms && selected.rooms.length > 0 ? (
        <View style={{ marginTop: theme.spacing.sm, gap: 2 }}>
          <Text variant="labelMedium" style={{ color: realestate.colors.onSurfaceVariant }}>
            Rooms on this floor
          </Text>
          {selected.rooms.map((room) => (
            <TouchableRipple
              key={room.id}
              onPress={onRoomPress ? () => onRoomPress(room.id) : undefined}
              disabled={!onRoomPress}
              accessibilityRole={onRoomPress ? 'button' : 'text'}
              accessibilityLabel={room.label}
              testID={childTestID(id, `room-${room.id}`)}
            >
              <Text variant="bodySmall" style={{ paddingVertical: 3 }}>
                {room.label}
              </Text>
            </TouchableRipple>
          ))}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  imageWrap: { height: 220, overflow: 'hidden' },
  image: { width: '100%', height: 220 },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  controlsRow: { position: 'absolute', top: 6, right: 6, flexDirection: 'row', gap: 4 },
  noMargin: { margin: 0 },
});
