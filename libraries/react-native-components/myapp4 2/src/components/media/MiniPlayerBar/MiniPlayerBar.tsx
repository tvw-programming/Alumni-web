import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, IconButton, ProgressBar, Surface, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { MiniPlayerItem, MiniPlayerStatus } from '../types/domain';

const STATUS_COPY: Partial<Record<MiniPlayerStatus, string>> = {
  error: 'Playback failed',
  offline: 'No connection',
};

export interface MiniPlayerBarProps extends StyleEscapeHatches {
  item: MiniPlayerItem;
  isPlaying: boolean;
  progress?: number;
  buffering?: boolean;
  status?: MiniPlayerStatus;
  onPlayPause: () => void;
  onOpen: () => void;
  onDismiss?: () => void;
  onNext?: () => void;
}

/**
 * A persistent, compact bar — not the only route to playback control. It
 * exposes play/pause, next, dismiss, and an "open full player" affordance,
 * but speed, queue, captions, and sleep timer all live one tap away in the
 * full player this bar opens.
 */
export const MiniPlayerBar = ({ item, isPlaying, progress, buffering = false, status, onPlayPause, onOpen, onDismiss, onNext, style, containerStyle, testID }: MiniPlayerBarProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const insets = useSafeAreaInsets();
  const id = testID ?? 'mini-player-bar';
  const statusNote = status ? STATUS_COPY[status] : undefined;

  const a11yLabel = `Now playing: ${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}${statusNote ? `, ${statusNote}` : ''}`;

  return (
    <Surface elevation={4} style={[styles.root, { backgroundColor: media.colors.surface, paddingBottom: insets.bottom }, containerStyle, style]} testID={id}>
      {progress != null ? (
        <ProgressBar progress={progress} color={media.colors.progressValue} style={{ height: 2, backgroundColor: media.colors.progressTrack }} />
      ) : null}

      <TouchableRipple onPress={onOpen} accessibilityRole="button" accessibilityLabel={`${a11yLabel}. Open player.`} testID={childTestID(id, 'open')}>
        <View style={[styles.row, { height: media.layout.miniPlayerHeight, paddingHorizontal: 8 }]}>
          <View style={[styles.artwork, { backgroundColor: media.colors.surfaceVariant }]}>
            {item.artwork?.uri ? (
              <Image source={{ uri: item.artwork.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
            ) : (
              <Icon source="music-note-outline" size={18} color={media.colors.onSurfaceVariant} />
            )}
          </View>

          <View style={[styles.flex, { marginLeft: 10 }]}>
            <Text variant="bodyMedium" numberOfLines={1} style={{ color: media.colors.onSurface }}>
              {item.title}
            </Text>
            <Text variant="labelSmall" numberOfLines={1} style={{ color: statusNote ? media.colors.error : media.colors.onSurfaceVariant }}>
              {statusNote ?? item.subtitle ?? ''}
            </Text>
          </View>

          {onNext ? (
            <IconButton icon="skip-next" size={20} onPress={onNext} accessibilityLabel="Next" style={styles.noMargin} testID={childTestID(id, 'next')} />
          ) : null}

          {buffering ? (
            <ActivityIndicator size={20} style={styles.playButton} accessibilityLabel="Buffering" />
          ) : (
            <IconButton
              icon={isPlaying ? 'pause' : 'play'}
              size={22}
              onPress={onPlayPause}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
              style={styles.noMargin}
              testID={childTestID(id, 'play-pause')}
            />
          )}

          {onDismiss ? (
            <IconButton icon="close" size={18} onPress={onDismiss} accessibilityLabel="Dismiss mini player" style={styles.noMargin} testID={childTestID(id, 'dismiss')} />
          ) : null}
        </View>
      </TouchableRipple>
    </Surface>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  artwork: { width: 40, height: 40, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
  playButton: { marginHorizontal: 8 },
});
