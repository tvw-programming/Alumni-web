import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, ProgressBar, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useSmartHomeTheme } from '../theme/iotTokens';
import type { FirmwareStatus } from '../types/domain';

export interface FirmwareUpdateCardProps extends StyleEscapeHatches {
  deviceName: string;
  currentVersion: string;
  availableVersion?: string;
  status: FirmwareStatus;
  downloadProgress?: number;
  releaseNotes?: string;
  blockedReason?: string;
  onInstall: () => void;
  onDismiss?: () => void;
}

const STATUS_META: Record<FirmwareStatus, { label: string; colorKey: 'online' | 'pending' | 'error' | 'offline' }> = {
  upToDate: { label: 'Up to date', colorKey: 'online' },
  available: { label: 'Update available', colorKey: 'pending' },
  downloading: { label: 'Downloading update', colorKey: 'pending' },
  installing: { label: 'Installing update', colorKey: 'pending' },
  restarting: { label: 'Restarting device', colorKey: 'pending' },
  success: { label: 'Update installed', colorKey: 'online' },
  error: { label: "Update didn't finish", colorKey: 'error' },
  blocked: { label: 'Update blocked', colorKey: 'offline' },
};

/**
 * "Success" is only ever declared once install and restart both finish —
 * reaching 100% download is rendered as "Installing update," never as
 * completion, so nobody unplugs a device mid-flash believing it's done.
 */
export const FirmwareUpdateCard = ({ deviceName, currentVersion, availableVersion, status, downloadProgress = 0, releaseNotes, blockedReason, onInstall, onDismiss, style, containerStyle, testID }: FirmwareUpdateCardProps) => {
  const theme = useAppTheme();
  const iot = useSmartHomeTheme();
  const id = testID ?? `firmware-${deviceName.toLowerCase().replace(/\s+/g, '-')}`;
  const meta = STATUS_META[status];
  const inProgress = status === 'downloading' || status === 'installing' || status === 'restarting';

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.xs }}>
        <View style={styles.row}>
          <Icon source="chip" size={18} color={iot.colors.onSurfaceVariant} />
          <View style={[styles.flex, { marginLeft: 8 }]}>
            <Text variant="titleSmall">{deviceName}</Text>
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
              Current version {currentVersion}
              {availableVersion ? ` · Available ${availableVersion}` : ''}
            </Text>
          </View>
        </View>

        <View style={styles.row}>
          {status === 'error' ? (
            <Icon source="alert-circle-outline" size={13} color={iot.colors[meta.colorKey]} />
          ) : status === 'success' ? (
            <Icon source="check-circle" size={13} color={iot.colors[meta.colorKey]} />
          ) : status === 'blocked' ? (
            <Icon source="lock-outline" size={13} color={iot.colors[meta.colorKey]} />
          ) : inProgress ? null : (
            <Icon source="cloud-download-outline" size={13} color={iot.colors[meta.colorKey]} />
          )}
          <Text variant="labelSmall" style={{ color: iot.colors[meta.colorKey], marginLeft: status === 'downloading' ? 0 : 4 }} accessibilityLiveRegion={inProgress ? 'polite' : 'none'}>
            {meta.label}
          </Text>
        </View>

        {status === 'downloading' ? (
          <View>
            <ProgressBar progress={downloadProgress} color={theme.colors.primary} style={{ height: 4, borderRadius: 2, backgroundColor: iot.colors.surfaceVariant }} />
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant, marginTop: 2 }}>
              {Math.round(downloadProgress * 100)}%
            </Text>
          </View>
        ) : null}

        {status === 'installing' || status === 'restarting' ? (
          <View style={styles.row}>
            <ActivityIndicator size={14} />
            <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant, marginLeft: 6 }}>
              {status === 'installing' ? "Don't unplug the device while it installs." : 'The device is restarting — this can take a minute.'}
            </Text>
          </View>
        ) : null}

        {status === 'blocked' && blockedReason ? (
          <Text variant="labelSmall" style={{ color: iot.colors.onSurfaceVariant }}>
            {blockedReason}
          </Text>
        ) : null}

        {status === 'available' && releaseNotes ? (
          <Text variant="bodySmall" style={{ color: iot.colors.onSurfaceVariant }} numberOfLines={3}>
            {releaseNotes}
          </Text>
        ) : null}

        {status === 'available' ? (
          <View style={styles.row}>
            <AppButton variant="primary" size="sm" onPress={onInstall} testID={childTestID(id, 'install')}>
              Install update
            </AppButton>
            {onDismiss ? (
              <AppButton variant="ghost" size="sm" onPress={onDismiss} style={{ marginLeft: 8 }} testID={childTestID(id, 'dismiss')}>
                Later
              </AppButton>
            ) : null}
          </View>
        ) : status === 'error' ? (
          <AppButton variant="primary" size="sm" onPress={onInstall} testID={childTestID(id, 'retry')}>
            Try again
          </AppButton>
        ) : null}
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
