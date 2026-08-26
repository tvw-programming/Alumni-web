import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { ToggleTileState } from '../types/domain';

export interface DeviceToggleTileProps extends StyleEscapeHatches {
  label: string;
  icon: string;
  state: ToggleTileState;
  value?: string;
  disabled?: boolean;
  onToggle: () => void;
  onPress?: () => void;
  onLongPress?: () => void;
}

/**
 * On/off is never shown through background colour alone — the icon colour,
 * the label, and (when relevant) the value text all change together. A
 * command controller upstream is expected to use request IDs so a stale
 * "pending" response can never overwrite a newer tap.
 */
export const DeviceToggleTile = ({ label, icon, state, value, disabled = false, onToggle, onPress, onLongPress, style, containerStyle, testID }: DeviceToggleTileProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `device-tile-${label.toLowerCase().replace(/\s+/g, '-')}`;
  const on = state === 'on';
  const pending = state === 'pending';
  const offline = state === 'offline' || state === 'error';
  const interactive = !disabled && !offline && !pending;

  const a11yLabel = `${label}${value ? `, ${value}` : ''}, ${offline ? (state === 'offline' ? 'unavailable' : 'error') : pending ? 'updating' : on ? 'on' : 'off'}`;

  return (
    <TouchableRipple
      onPress={interactive ? (onPress ?? onToggle) : undefined}
      onLongPress={interactive ? onLongPress : undefined}
      disabled={!interactive}
      accessibilityRole="switch"
      accessibilityState={{ checked: on, disabled: !interactive }}
      accessibilityLabel={a11yLabel}
      style={[
        styles.tile,
        {
          width: iot.layout.tileSize,
          height: iot.layout.tileSize,
          borderRadius: theme.radii.md,
          backgroundColor: on ? iot.colors.surfaceVariant : theme.colors.surface,
          borderColor: on ? iot.colors.deviceOn : theme.colors.outlineVariant,
          borderWidth: on ? 2 : StyleSheet.hairlineWidth,
          opacity: offline || disabled ? 0.5 : 1,
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      <View style={styles.content}>
        {pending ? (
          <ActivityIndicator size={22} />
        ) : (
          <Icon source={offline ? 'connection' : icon} size={26} color={on ? iot.colors.deviceOn : iot.colors.onSurfaceVariant} />
        )}
        <Text variant="labelMedium" numberOfLines={2} style={{ textAlign: 'center', marginTop: 6 }}>
          {label}
        </Text>
        <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant, marginTop: 2 }}>
          {pending ? 'Updating…' : offline ? (state === 'offline' ? 'Unavailable' : 'Error') : value ?? (on ? 'On' : 'Off')}
        </Text>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  content: { alignItems: 'center', padding: 8 },
});
