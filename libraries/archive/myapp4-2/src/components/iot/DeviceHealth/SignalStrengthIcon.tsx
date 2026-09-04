import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { SignalProtocol, SignalStatus } from '../types/domain';

export interface SignalStrengthIconProps extends StyleEscapeHatches {
  level?: number;
  status?: SignalStatus;
  protocol?: SignalProtocol;
  showLabel?: boolean;
}

const PROTOCOL_ICON: Record<SignalProtocol, { good: string; poor: string; offline: string }> = {
  wifi: { good: 'wifi', poor: 'wifi-strength-1', offline: 'wifi-off' },
  bluetooth: { good: 'bluetooth', poor: 'bluetooth', offline: 'bluetooth-off' },
  thread: { good: 'radio-tower', poor: 'radio-tower', offline: 'signal-off' },
  cellular: { good: 'signal-cellular-3', poor: 'signal-cellular-1', offline: 'signal-off' },
};

const STATUS_LABEL: Record<SignalStatus, string> = {
  excellent: 'Signal excellent',
  good: 'Signal good',
  fair: 'Signal fair',
  poor: 'Signal weak',
  offline: 'Device offline',
  unknown: 'Signal unknown',
};

export const SignalStrengthIcon = ({ level, status = 'unknown', protocol = 'wifi', showLabel = true, style, containerStyle, testID }: SignalStrengthIconProps) => {
  const iot = useSmartHomeTheme();
  const id = testID ?? 'signal-strength-icon';
  const colorKey = status === 'excellent' || status === 'good' ? 'signalStrong' : status === 'fair' || status === 'poor' ? 'signalWeak' : status === 'offline' ? 'signalOffline' : 'onSurfaceVariant';
  const icons = PROTOCOL_ICON[protocol];
  const iconName = status === 'offline' ? icons.offline : status === 'excellent' || status === 'good' ? icons.good : icons.poor;

  return (
    <View style={[styles.row, containerStyle, style]} testID={id} accessibilityRole="text" accessibilityLabel={`${STATUS_LABEL[status]}${level != null ? `, ${level} percent` : ''}`}>
      <Icon source={iconName} size={16} color={iot.colors[colorKey]} />
      {showLabel ? (
        <Text variant="labelSmall" style={{ color: iot.colors[colorKey], marginLeft: 4 }}>
          {STATUS_LABEL[status]}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
