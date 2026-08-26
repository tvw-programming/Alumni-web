import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useRideTheme } from '../theme/transportationTokens';
import type { MapMarker, MapMarkerType, RouteSegment } from '../types/domain';

const MARKER_META: Record<MapMarkerType, { icon: string; colorKey: 'markerPickup' | 'markerDropoff' | 'markerDriver' | 'markerUser' }> = {
  pickup: { icon: 'circle-outline', colorKey: 'markerPickup' },
  dropoff: { icon: 'map-marker', colorKey: 'markerDropoff' },
  driver: { icon: 'car', colorKey: 'markerDriver' },
  user: { icon: 'account-circle', colorKey: 'markerUser' },
  waypoint: { icon: 'map-marker-outline', colorKey: 'markerDriver' },
};

const MODE_ICON: Record<NonNullable<RouteSegment['mode']>, string> = {
  ride: 'car-side',
  walking: 'walk',
  transfer: 'transit-connection-variant',
};

export interface MapMarkerCalloutProps extends StyleEscapeHatches {
  markers: MapMarker[];
  routeSegments?: RouteSegment[];
  selectedMarkerId?: string;
  showLegend?: boolean;
  /** Map rendering is adapter-based — pass a real map view here; a placeholder renders otherwise. */
  mapSlot?: React.ReactNode;
  onMarkerPress?: (marker: MapMarker) => void;
  onExpand?: () => void;
}

/**
 * Markers use distinct icons, not colour alone, so pickup/dropoff/driver/user
 * are distinguishable without colour vision. A full text-list alternative
 * always renders alongside the map surface — pickup adjustment and marker
 * details are reachable by list, never map-only.
 */
export const MapMarkerCallout = ({
  markers,
  routeSegments = [],
  selectedMarkerId,
  showLegend = true,
  mapSlot,
  onMarkerPress,
  onExpand,
  style,
  containerStyle,
  testID,
}: MapMarkerCalloutProps) => {
  const theme = useAppTheme();
  const ride = useRideTheme();
  const id = testID ?? 'map-marker-callout';
  const [announced, setAnnounced] = useState<string | null>(null);

  const selected = markers.find((m) => m.id === selectedMarkerId);

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple
        onPress={onExpand}
        disabled={!onExpand}
        accessibilityRole={onExpand ? 'button' : undefined}
        accessibilityLabel={onExpand ? 'Expand map' : undefined}
        style={[styles.mapBox, { height: ride.layout.mapPreviewHeight, backgroundColor: ride.colors.surfaceMap, borderRadius: theme.radii.md }]}
        testID={childTestID(id, 'map')}
      >
        <View style={styles.mapContent} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {mapSlot ?? <Icon source="map-outline" size={28} color={theme.colors.onSurfaceVariant} />}
        </View>
      </TouchableRipple>

      {selected ? (
        <View style={[styles.callout, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderRadius: theme.radii.sm }]} accessibilityLiveRegion="polite">
          <Icon source={MARKER_META[selected.type].icon} size={14} color={ride.colors[MARKER_META[selected.type].colorKey]} />
          <Text variant="labelSmall" style={{ marginLeft: 6, flex: 1 }}>
            {selected.label}
            {selected.status ? ` · ${selected.status}` : ''}
          </Text>
        </View>
      ) : null}

      {/* Mandatory textual/list alternative to the map */}
      <View style={{ marginTop: theme.spacing.sm, gap: 4 }} accessibilityRole="list">
        {markers.map((marker) => {
          const meta = MARKER_META[marker.type];
          const isSelected = marker.id === selectedMarkerId;
          return (
            <TouchableRipple
              key={marker.id}
              onPress={() => {
                onMarkerPress?.(marker);
                setAnnounced(`${marker.label}${marker.status ? `, ${marker.status}` : ''}`);
              }}
              disabled={!onMarkerPress}
              accessibilityRole={onMarkerPress ? 'button' : 'text'}
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${marker.label}${marker.status ? `, ${marker.status}` : ''}`}
              style={[styles.markerRow, { backgroundColor: isSelected ? ride.colors.surfaceSelected : 'transparent', borderRadius: theme.radii.sm }]}
              testID={childTestID(id, `marker-${marker.id}`)}
            >
              <View style={styles.row}>
                <Icon source={meta.icon} size={16} color={ride.colors[meta.colorKey]} />
                <Text variant="bodySmall" style={{ marginLeft: 8, flex: 1 }} numberOfLines={1}>
                  {marker.label}
                </Text>
                {marker.status ? (
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {marker.status}
                  </Text>
                ) : null}
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      {showLegend && routeSegments.length > 0 ? (
        <View style={[styles.legendRow, { marginTop: theme.spacing.sm }]}>
          {routeSegments.map((segment) => (
            <View key={segment.id} style={styles.legendItem}>
              <Icon source={segment.mode ? MODE_ICON[segment.mode] : 'route'} size={13} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 4 }}>
                {segment.label ?? (segment.mode ? segment.mode : 'Route')}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {announced ? (
        <Text accessibilityLiveRegion="polite" style={styles.srOnly}>
          {announced}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  mapBox: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  mapContent: { alignItems: 'center', justifyContent: 'center' },
  callout: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, padding: 8, marginTop: 8 },
  markerRow: { paddingVertical: 6, paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  srOnly: { position: 'absolute', width: 1, height: 1, overflow: 'hidden' },
});
