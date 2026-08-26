import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, IconButton, Switch, Text, TouchableRipple } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { DeviceConnection, SmartDevice } from '../types/domain';
import { BatteryIndicator } from '../DeviceHealth/BatteryIndicator';
import { SignalStrengthIcon } from '../DeviceHealth/SignalStrengthIcon';

const CONNECTION_META: Record<DeviceConnection, { label: string; colorKey: 'online' | 'offline' | 'pending' | 'error' }> = {
  online: { label: 'Online', colorKey: 'online' },
  offline: { label: 'Offline', colorKey: 'offline' },
  connecting: { label: 'Connecting…', colorKey: 'pending' },
  error: { label: 'No response', colorKey: 'error' },
};

export interface DeviceCardProps extends StyleEscapeHatches {
  device: SmartDevice;
  compact?: boolean;
  showQuickToggle?: boolean;
  toggling?: boolean;
  onPress: (device: SmartDevice) => void;
  onToggle?: (device: SmartDevice, next: boolean) => void;
  onMore?: (device: SmartDevice) => void;
}

/**
 * The switch is optimistic but always recoverable — a pending command shows
 * a distinct in-flight state, and if the device rejects the command the
 * switch snaps back with an explanation ("Couldn't turn on. Device is
 * offline.") rather than silently reverting with no context. An offline
 * device never appears to have successfully turned on.
 */
export const DeviceCard = ({ device, compact = false, showQuickToggle = true, toggling = false, onPress, onToggle, onMore, style, containerStyle, testID }: DeviceCardProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `device-${device.id}`;
  const [imgError, setImgError] = useState(false);
  const meta = CONNECTION_META[device.connection];
  const offline = device.connection === 'offline' || device.connection === 'error';
  const canToggle = showQuickToggle && onToggle && device.capabilities.includes('power') && !offline;

  const a11yLabel = `${device.name}${device.room ? `, ${device.room}` : ''}, ${device.powerState === 'on' ? 'on' : device.powerState === 'off' ? 'off' : 'state unknown'}, ${meta.label}`;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <TouchableRipple onPress={() => onPress(device)} accessibilityRole="button" accessibilityLabel={a11yLabel}>
        <View style={styles.row}>
          <View style={[styles.iconWrap, { width: iot.layout.deviceIconSize, height: iot.layout.deviceIconSize, backgroundColor: iot.colors.surfaceVariant, borderRadius: iot.layout.deviceIconSize / 2 }]}>
            {device.image?.uri && !imgError ? (
              <Image source={{ uri: device.image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImgError(true)} accessibilityElementsHidden />
            ) : (
              <Icon source={device.icon ?? 'power-plug-outline'} size={20} color={iot.colors.onSurfaceVariant} />
            )}
          </View>

          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {device.name}
            </Text>
            {device.room && !compact ? (
              <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }} numberOfLines={1}>
                {device.room}
              </Text>
            ) : null}
            <View style={styles.row}>
              <Icon source={device.connection === 'connecting' ? 'sync' : 'circle-medium'} size={10} color={iot.colors[meta.colorKey]} />
              <Text variant="labelSmall" style={{ color: iot.colors[meta.colorKey], marginLeft: 2 }}>
                {meta.label}
              </Text>
              {device.sync?.lastSeenAt && offline ? (
                <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant, marginLeft: 6 }}>
                  Last seen {device.sync.lastSeenAt}
                </Text>
              ) : null}
            </View>
            {!compact && (device.batteryLevel != null || device.signalStatus) ? (
              <View style={[styles.row, { marginTop: 2, gap: 10 }]}>
                {device.batteryLevel != null ? <BatteryIndicator level={device.batteryLevel} status={device.batteryStatus} showLabel={false} /> : null}
                {device.signalStatus ? <SignalStrengthIcon status={device.signalStatus} protocol={device.signalProtocol} showLabel={false} /> : null}
              </View>
            ) : null}
          </View>

          {toggling ? (
            <ActivityIndicator size={18} accessibilityLabel="Updating device" testID={childTestID(id, 'pending')} />
          ) : canToggle ? (
            <Switch value={device.powerState === 'on'} onValueChange={(next) => onToggle!(device, next)} accessibilityLabel={`Turn ${device.name} ${device.powerState === 'on' ? 'off' : 'on'}`} testID={childTestID(id, 'switch')} />
          ) : offline && device.capabilities.includes('power') ? (
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
              Unavailable
            </Text>
          ) : null}

          {onMore ? <IconButton icon="dots-vertical" size={16} onPress={() => onMore(device)} accessibilityLabel={`More options for ${device.name}`} style={styles.noMargin} testID={childTestID(id, 'more')} /> : null}
        </View>
      </TouchableRipple>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
});
