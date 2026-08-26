import React from 'react';
import { ActivityIndicator, IconButton, ProgressBar, Text } from 'react-native-paper';
import { StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { DownloadStatus } from '../types/domain';

const STATUS_META: Record<DownloadStatus, { icon: string; label: string }> = {
  idle: { icon: 'download-outline', label: 'Download' },
  queued: { icon: 'clock-outline', label: 'Queued' },
  downloading: { icon: 'progress-download', label: 'Downloading' },
  paused: { icon: 'pause-circle-outline', label: 'Download paused' },
  done: { icon: 'check-circle', label: 'Downloaded' },
  error: { icon: 'alert-circle-outline', label: 'Download failed' },
  expired: { icon: 'clock-alert-outline', label: 'Download expired' },
  unavailable: { icon: 'download-off-outline', label: 'Not available for download' },
};

export interface DownloadStatusButtonProps extends StyleEscapeHatches {
  title: string;
  status: DownloadStatus;
  progress?: number;
  disabled?: boolean;
  size?: 'small' | 'medium';
  onStart?: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRemove?: () => void;
  onRetry?: () => void;
}

/**
 * Idempotent by design — the button never starts a download itself; it only
 * dispatches an intent (`onStart`, `onPause`, …) and renders whatever durable
 * status the download manager reports back. A download in progress always
 * shows a real percentage, never a spinner standing in for known progress.
 */
export const DownloadStatusButton = ({ title, status, progress, disabled = false, size = 'medium', onStart, onPause, onResume, onRemove, onRetry, style, containerStyle, testID }: DownloadStatusButtonProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? 'download-status-button';
  const meta = STATUS_META[status];
  const iconSize = size === 'small' ? 18 : 22;

  const color =
    status === 'done' ? media.colors.downloaded : status === 'downloading' || status === 'queued' ? media.colors.downloading : status === 'error' || status === 'expired' ? media.colors.error : theme.colors.onSurfaceVariant;

  const handlePress = () => {
    if (status === 'idle') onStart?.();
    else if (status === 'downloading') onPause?.();
    else if (status === 'paused') onResume?.();
    else if (status === 'done') onRemove?.();
    else if (status === 'error') onRetry?.();
  };

  const a11yLabel = `${title}: ${meta.label}${status === 'downloading' && progress != null ? `, ${Math.round(progress * 100)} percent` : ''}`;
  const interactive = status !== 'unavailable' && status !== 'expired' && !disabled;

  if (status === 'downloading' && progress != null) {
    return (
      <View style={[styles.progressRow, containerStyle, style]} testID={id}>
        <IconButton
          icon="pause"
          size={iconSize}
          iconColor={media.colors.downloading}
          disabled={!interactive}
          onPress={handlePress}
          accessibilityLabel={`${a11yLabel}. Pause download.`}
          style={styles.noMargin}
          testID={childTestID(id, 'pause')}
        />
        <View style={styles.progressTrackWrap}>
          <ProgressBar progress={progress} color={media.colors.downloading} style={{ height: 4, borderRadius: 2, backgroundColor: media.colors.progressTrack }} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
            {Math.round(progress * 100)}%
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      {status === 'queued' ? (
        <ActivityIndicator size={iconSize} color={color} accessibilityLabel={a11yLabel} testID={childTestID(id, 'spinner')} />
      ) : (
        <IconButton
          icon={meta.icon}
          size={iconSize}
          iconColor={color}
          disabled={!interactive}
          onPress={handlePress}
          accessibilityLabel={a11yLabel}
          accessibilityState={{ disabled: !interactive }}
          style={styles.noMargin}
          testID={childTestID(id, 'icon')}
        />
      )}
      {status === 'unavailable' || status === 'expired' ? (
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {status === 'expired' ? 'Expired' : 'Unavailable'}
        </Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  noMargin: { margin: 0 },
  progressRow: { flexDirection: 'row', alignItems: 'center' },
  progressTrackWrap: { width: 64 },
});
