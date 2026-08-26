/**
 * USAGE — MapMarkerCallout
 *
 * Every marker is reachable and selectable from the text list below the map
 * placeholder — pickup adjustment never depends on precise map tapping.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MapMarker, RouteSegment } from '../types/domain';
import { MapMarkerCallout } from './MapMarkerCallout';
import sample from './MapMarkerCallout.sample.json';

const { markers, routeSegments } = loadSample<{ markers: MapMarker[]; routeSegments: RouteSegment[] }>(sample);

export const MapMarkerCalloutUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [selectedId, setSelectedId] = useState('m-2');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <MapMarkerCallout
        markers={markers}
        routeSegments={routeSegments}
        selectedMarkerId={selectedId}
        onMarkerPress={(marker) => setSelectedId(marker.id)}
        onExpand={() => toast.show('Opening full-screen map')}
      />
    </ScrollView>
  );
};
