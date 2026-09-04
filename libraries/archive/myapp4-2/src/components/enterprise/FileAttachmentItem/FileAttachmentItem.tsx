import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Avatar, Icon, IconButton, Menu, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import { useState } from 'react';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { FileAttachment } from '../types/domain';

const MIME_ICON: { match: (mime: string) => boolean; icon: string }[] = [
  { match: (m) => m.startsWith('image/'), icon: 'file-image-outline' },
  { match: (m) => m.startsWith('video/'), icon: 'file-video-outline' },
  { match: (m) => m === 'application/pdf', icon: 'file-pdf-box' },
  { match: (m) => m.includes('spreadsheet') || m.includes('csv'), icon: 'file-table-outline' },
  { match: (m) => m.includes('presentation'), icon: 'file-powerpoint-outline' },
  { match: (m) => m.includes('word') || m.includes('document'), icon: 'file-word-outline' },
  { match: (m) => m.startsWith('audio/'), icon: 'file-music-outline' },
  { match: (m) => m.includes('zip') || m.includes('compressed'), icon: 'folder-zip-outline' },
];

const iconFor = (mime: string) => MIME_ICON.find((entry) => entry.match(mime))?.icon ?? 'file-outline';

const formatSize = (bytes?: number) => {
  if (bytes == null) return undefined;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export interface FileAttachmentItemProps extends StyleEscapeHatches {
  file: FileAttachment;
  onPress?: (file: FileAttachment) => void;
  onDownload?: (file: FileAttachment) => void;
  onRetry?: (file: FileAttachment) => void;
  onRemove?: (file: FileAttachment) => void;
}

/**
 * Download and remove are always independent tap targets — never combined
 * into one row-press action a user could trigger by accident. A file-type
 * icon is decoration; the accessible label always states the real filename,
 * type, size, and status in full.
 */
export const FileAttachmentItem = ({ file, onPress, onDownload, onRetry, onRemove, style, containerStyle, testID }: FileAttachmentItemProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `file-${file.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const sizeLabel = formatSize(file.sizeBytes);
  const busy = file.status === 'uploading' || file.status === 'downloading';

  const statusLabel =
    file.status === 'uploading'
      ? `Uploading${file.progress != null ? `, ${Math.round(file.progress * 100)}%` : ''}`
      : file.status === 'downloading'
        ? `Downloading${file.progress != null ? `, ${Math.round(file.progress * 100)}%` : ''}`
        : file.status === 'error'
          ? 'Upload failed'
          : file.status === 'expired'
            ? 'File unavailable'
            : undefined;

  const a11yLabel = `${file.name}, ${file.mimeType}${sizeLabel ? `, ${sizeLabel}` : ''}${statusLabel ? `, ${statusLabel}` : ''}`;

  return (
    <TouchableRipple onPress={onPress && file.status === 'available' ? () => onPress(file) : undefined} disabled={!onPress || file.status !== 'available'} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} style={[containerStyle, style]} testID={id}>
      <View style={styles.row}>
        <Avatar.Icon size={36} icon={iconFor(file.mimeType)} style={{ backgroundColor: enterprise.colors.surfaceVariant }} color={enterprise.colors.onSurfaceVariant} />

        <View style={[styles.flex, { marginLeft: 8 }]}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {file.name}
          </Text>
          {busy && file.progress != null ? (
            <ProgressBar progress={file.progress} color={theme.colors.primary} style={{ height: 4, borderRadius: 2, marginTop: 4, backgroundColor: enterprise.colors.surfaceVariant }} />
          ) : null}
          <View style={styles.metaRow}>
            {sizeLabel ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
                {sizeLabel}
              </Text>
            ) : null}
            {statusLabel ? (
              <Text variant="labelSmall" style={{ color: file.status === 'error' ? theme.colors.error : enterprise.colors.onSurfaceVariant, marginLeft: sizeLabel ? 8 : 0 }}>
                {statusLabel}
              </Text>
            ) : null}
          </View>
        </View>

        {busy ? (
          <ActivityIndicator size={18} accessibilityLabel={statusLabel} />
        ) : file.status === 'error' && onRetry ? (
          <IconButton icon="refresh" size={18} onPress={() => onRetry(file)} accessibilityLabel={`Retry uploading ${file.name}`} style={styles.noMargin} testID={childTestID(id, 'retry')} />
        ) : (
          <>
            {onDownload && file.status === 'available' ? (
              <IconButton icon="download-outline" size={18} onPress={() => onDownload(file)} accessibilityLabel={`Download ${file.name}`} style={styles.noMargin} testID={childTestID(id, 'download')} />
            ) : null}
            {onRemove ? (
              <Menu
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${file.name}`} style={styles.noMargin} testID={childTestID(id, 'menu')} />}
              >
                <Menu.Item onPress={() => { setMenuVisible(false); onRemove(file); }} title="Remove" leadingIcon="delete-outline" testID={childTestID(id, 'remove')} />
              </Menu>
            ) : null}
          </>
        )}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  noMargin: { margin: 0 },
});
