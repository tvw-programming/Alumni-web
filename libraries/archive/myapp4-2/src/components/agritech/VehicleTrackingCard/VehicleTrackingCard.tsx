import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useAgriLogisticsTheme } from '../theme/agritechTokens';
import type { VehicleTracking, VehicleTrackingStatus } from '../types/domain';

export interface VehicleTrackingCardProps extends StyleEscapeHatches {
  vehicle: VehicleTracking;
  onExpandMap?: (vehicle: VehicleTracking) => void;
  onCall?: (vehicle: VehicleTracking) => void;
  onChat?: (vehicle: VehicleTracking) => void;
  onSupport?: (vehicle: VehicleTracking) => void;
}

const STATUS_META: Record<VehicleTrackingStatus, { label: string; colorKey: 'trackingLive' | 'trackingStale' | 'trackingOffline' }> = {
  live: { label: 'Vehicle en route', colorKey: 'trackingLive' },
  stale: { label: 'Location temporarily unavailable', colorKey: 'trackingStale' },
  offline: { label: 'Tracking offline', colorKey: 'trackingOffline' },
  ended: { label: 'Trip ended', colorKey: 'trackingOffline' },
};

/**
 * The map preview always ships a text route/ETA alternative, and calling a
 * driver goes through `onCall` — a relay contact, never a raw phone number
 * rendered on screen — to protect driver privacy after delivery.
 */
export const VehicleTrackingCard = ({ vehicle, onExpandMap, onCall, onChat, onSupport, style, containerStyle, testID }: VehicleTrackingCardProps) => {
  const theme = useAppTheme();
  const agri = useAgriLogisticsTheme();
  const id = testID ?? `vehicle-${vehicle.id}`;
  const meta = STATUS_META[vehicle.trackingStatus];
  const [avatarFailed, setAvatarFailed] = React.useState(false);

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: 8 }}>
        <TouchableRipple
          onPress={onExpandMap ? () => onExpandMap(vehicle) : undefined}
          disabled={!onExpandMap}
          style={[styles.mapPreview, { borderRadius: theme.radii.sm, backgroundColor: agri.colors.surfaceVariant }]}
        >
          <Icon source="map-marker-path" size={26} color={agri.colors.onSurfaceVariant} />
        </TouchableRipple>

        <View style={styles.row}>
          {vehicle.driverAvatarUri?.uri && !avatarFailed ? (
            <Avatar.Image size={36} source={{ uri: vehicle.driverAvatarUri.uri }} onError={() => setAvatarFailed(true)} />
          ) : (
            <Avatar.Icon size={36} icon="account" style={{ backgroundColor: agri.colors.surfaceVariant }} />
          )}
          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <Text variant="bodyMedium">{vehicle.driverName ? `Driver: ${vehicle.driverName}` : 'Driver not yet assigned'}</Text>
            <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
              {vehicle.vehicleType ? `${vehicle.vehicleType} · ` : ''}
              {vehicle.vehicleNumber}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          <Icon source={vehicle.trackingStatus === 'live' ? 'circle-slice-8' : 'circle-outline'} size={12} color={agri.colors[meta.colorKey]} />
          <Text variant="labelMedium" style={{ color: agri.colors[meta.colorKey], marginLeft: 4, flex: 1 }}>
            {meta.label}
            {vehicle.eta && vehicle.trackingStatus === 'live' ? ` · Arriving in ${vehicle.eta}` : ''}
          </Text>
        </View>

        <Text variant="labelSmall" style={{ color: agri.colors.onSurfaceVariant }}>
          {vehicle.lastUpdatedAt ? `Last updated ${vehicle.lastUpdatedAt}` : 'No location data yet'}
        </Text>

        <View style={styles.row}>
          {onCall ? <IconButton icon="phone-outline" size={18} onPress={() => onCall(vehicle)} accessibilityLabel="Contact driver" style={styles.noMargin} testID={childTestID(id, 'call')} /> : null}
          {onChat ? <IconButton icon="message-outline" size={18} onPress={() => onChat(vehicle)} accessibilityLabel="Chat with driver" style={styles.noMargin} testID={childTestID(id, 'chat')} /> : null}
          {onSupport ? <IconButton icon="lifebuoy" size={18} onPress={() => onSupport(vehicle)} accessibilityLabel="Contact support" style={styles.noMargin} testID={childTestID(id, 'support')} /> : null}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  mapPreview: { height: 100, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
});
