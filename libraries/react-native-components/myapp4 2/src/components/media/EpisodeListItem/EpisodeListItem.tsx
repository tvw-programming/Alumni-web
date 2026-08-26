import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, IconButton, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { Episode } from '../types/domain';
import { DownloadStatusButton } from '../DownloadStatusButton/DownloadStatusButton';

export interface EpisodeListItemProps extends StyleEscapeHatches {
  episode: Episode;
  onPlay: (episode: Episode) => void;
  onDownload?: (episode: Episode) => void;
  onPauseDownload?: (episode: Episode) => void;
  onResumeDownload?: (episode: Episode) => void;
  onRemoveDownload?: (episode: Episode) => void;
  onRetryDownload?: (episode: Episode) => void;
  onMore?: (episode: Episode) => void;
}

/**
 * Play and download are two separate tap targets, deliberately — the row
 * itself is not one giant button, so a rider reaching for "download" can
 * never accidentally start playback.
 */
export const EpisodeListItem = ({ episode, onPlay, onDownload, onPauseDownload, onResumeDownload, onRemoveDownload, onRetryDownload, onMore, style, containerStyle, testID }: EpisodeListItemProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? `episode-${episode.id}`;
  const restricted = episode.availability?.status === 'restricted';
  const unavailable = episode.availability?.status === 'unavailable' || episode.availability?.status === 'expired';
  const watched = episode.progress != null && episode.progress >= 0.95;

  return (
    <View style={[styles.row, containerStyle, style]} testID={id}>
      <TouchableRipple
        onPress={unavailable ? undefined : () => onPlay(episode)}
        disabled={unavailable}
        accessibilityRole="button"
        accessibilityLabel={`Play episode ${episode.episodeNumber}: ${episode.title}${unavailable ? ', unavailable' : ''}`}
        style={{ borderRadius: theme.radii.sm, overflow: 'hidden' }}
        testID={childTestID(id, 'thumb')}
      >
        <View style={[styles.thumbBox, { width: media.layout.episodeThumbWidth, aspectRatio: media.layout.posterLandscapeRatio, backgroundColor: media.colors.surfaceVariant }]}>
          {episode.thumbnail?.uri ? (
            <Image source={{ uri: episode.thumbnail.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
          ) : (
            <View style={styles.centerFill}>
              <Icon source="image-off-outline" size={18} color={media.colors.onSurfaceVariant} />
            </View>
          )}
          {!unavailable ? (
            <View style={styles.playBadge} pointerEvents="none">
              <Icon source="play" size={20} color="#FFFFFF" />
            </View>
          ) : null}
          {episode.progress != null && !unavailable ? (
            <View style={styles.progressWrap}>
              <ProgressBar progress={episode.progress} color={media.colors.progressValue} style={{ height: 3, backgroundColor: media.colors.progressTrack }} />
            </View>
          ) : null}
        </View>
      </TouchableRipple>

      <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
        <View style={styles.titleRow}>
          <Text variant="bodyMedium" style={styles.flex} numberOfLines={2}>
            {episode.episodeNumber}. {episode.title}
          </Text>
          {watched ? <Icon source="check-circle" size={14} color={media.colors.downloaded} /> : null}
        </View>
        <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant }}>
          {episode.durationLabel}
          {episode.isSeasonFinale ? ' · Season finale' : ''}
        </Text>
        {episode.description ? (
          <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant, marginTop: 2 }} numberOfLines={2}>
            {episode.description}
          </Text>
        ) : null}
        {restricted ? (
          <Text variant="labelSmall" style={{ color: media.colors.restricted, marginTop: 2 }}>
            Restricted for this profile
          </Text>
        ) : unavailable ? (
          <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant, marginTop: 2 }}>
            {episode.availability?.status === 'expired' ? 'Episode expired' : 'Episode unavailable'}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {episode.downloadState && (onDownload || onPauseDownload || onResumeDownload || onRemoveDownload || onRetryDownload) ? (
          <DownloadStatusButton
            title={episode.title}
            status={episode.downloadState}
            progress={episode.downloadProgress}
            size="small"
            onStart={onDownload ? () => onDownload(episode) : undefined}
            onPause={onPauseDownload ? () => onPauseDownload(episode) : undefined}
            onResume={onResumeDownload ? () => onResumeDownload(episode) : undefined}
            onRemove={onRemoveDownload ? () => onRemoveDownload(episode) : undefined}
            onRetry={onRetryDownload ? () => onRetryDownload(episode) : undefined}
            testID={childTestID(id, 'download')}
          />
        ) : null}
        {onMore ? <IconButton icon="dots-vertical" size={16} onPress={() => onMore(episode)} accessibilityLabel={`More options for ${episode.title}`} style={styles.noMargin} testID={childTestID(id, 'more')} /> : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  thumbBox: { overflow: 'hidden' },
  centerFill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playBadge: { position: 'absolute', top: '50%', left: '50%', marginTop: -10, marginLeft: -10 },
  progressWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4 },
  actions: { alignItems: 'center', marginLeft: 4 },
  noMargin: { margin: 0 },
});
