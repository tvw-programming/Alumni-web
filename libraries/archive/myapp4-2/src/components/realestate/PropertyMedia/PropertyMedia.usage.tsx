/**
 * USAGE — FloorPlanViewer + ImageGalleryGrid
 *
 * Every floor's room list renders as plain text beneath the drawing — room
 * discovery never depends on tapping precise polygons on an image.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Floor, GalleryImage } from '../types/domain';
import { FloorPlanViewer } from './FloorPlanViewer';
import { ImageGalleryGrid } from './ImageGalleryGrid';
import sample from './PropertyMedia.sample.json';

const data = loadSample<{ floors: Floor[]; images: GalleryImage[] }>(sample);

export const PropertyMediaUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selectedFloor, setSelectedFloor] = useState(data.floors[0]!.id);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="titleSmall">Photos</Text>
      <ImageGalleryGrid images={data.images} onOpen={(imageId) => toast.show(`Opening photo ${imageId}`)} />

      <Text variant="titleSmall">Floor plan</Text>
      <FloorPlanViewer
        floors={data.floors}
        selectedFloorId={selectedFloor}
        onSelectFloor={setSelectedFloor}
        onRoomPress={(roomId) => toast.show(`Opening photos for room ${roomId}`)}
        onFullscreen={() => toast.show('Opening fullscreen floor plan')}
      />
    </ScrollView>
  );
};
