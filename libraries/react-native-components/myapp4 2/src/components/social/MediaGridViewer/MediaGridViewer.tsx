import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSheet } from '@ui/organisms/AppSheet';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useSocialTheme } from '../theme/socialTokens';
import type { MediaTile } from '../types/domain';

export interface MediaGridViewerProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  tiles: MediaTile[];
  columns?: number;
  loading?: boolean;
  /** Fixed aspect ratio keeps the grid from reflowing as images arrive. */
  aspectRatio?: number;
  onTilePress?: (tile: MediaTile, index: number) => void;
  onDownload?: (tile: MediaTile) => void;
  onShare?: (tile: MediaTile) => void;
  onReport?: (tile: MediaTile) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

/**
 * A media grid with a full-screen viewer.
 *
 * Tiles keep a fixed aspect ratio so the grid never reflows as images load —
 * a masonry layout whose DOM order differs from its visual order is the classic
 * inaccessible gallery, so source order stays logical here.
 *
 * Video never autoplays in the grid, sensitive media stays behind a warning
 * until the viewer opts in, and closing the viewer returns focus and scroll
 * position to the tile that opened it.
 */
export const MediaGridViewer = memo(function MediaGridViewer({
  tiles,
  columns = 3,
  loading = false,
  aspectRatio = 1,
  onTilePress,
  onDownload,
  onShare,
  onReport,
  emptyTitle = 'No media yet',
  emptyDescription = 'Photos and videos will appear here.',
  animated = true,
  style,
  containerStyle,
  testID,
}: MediaGridViewerProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const id = testID ?? 'media-grid';
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const gap = social.layout.mediaTileGap;
  const tileSize = (width - gap * (columns - 1)) / columns;

  /** Only ready tiles are navigable in the viewer. */
  const openable = useMemo(
    () => tiles.filter((tile) => tile.state === 'ready' || tile.state === 'restricted'),
    [tiles],
  );

  const openViewer = useCallback(
    (tile: MediaTile) => {
      const position = openable.findIndex((item) => item.id === tile.id);
      if (position < 0) return;
      setViewerIndex(position);
      AccessibilityInfo.announceForAccessibility(
        `Opened ${tile.media.alt}. Image ${position + 1} of ${openable.length}.`,
      );
    },
    [openable],
  );

  const goTo = useCallback(
    (next: number) => {
      if (next < 0 || next >= openable.length) return;
      setViewerIndex(next);
      const tile = openable[next];
      if (tile) {
        // Position is announced on every change, not just on open.
        AccessibilityInfo.announceForAccessibility(
          `Image ${next + 1} of ${openable.length}. ${tile.media.alt}`,
        );
      }
    },
    [openable],
  );

  if (loading) {
    return (
      <View style={[styles.grid, containerStyle]} testID={childTestID(id, 'loading')}>
        {Array.from({ length: columns * 3 }).map((_, index) => (
          <View key={index} style={{ width: tileSize, height: tileSize / aspectRatio, padding: gap / 2 }}>
            <SkeletonLoader shape="rect" containerStyle={StyleSheet.absoluteFillObject} />
          </View>
        ))}
      </View>
    );
  }

  if (tiles.length === 0) {
    return (
      <StateView
        preset="empty"
        compact
        title={emptyTitle}
        description={emptyDescription}
        containerStyle={containerStyle}
        testID={childTestID(id, 'empty')}
      />
    );
  }

  const current = viewerIndex != null ? openable[viewerIndex] : undefined;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.grid}>
        {tiles.map((tile, index) => {
          const isRevealed = revealed[tile.id] || !tile.contentWarning;
          const broken = tile.state === 'broken' || failed[tile.id];
          const restricted = tile.state === 'restricted';
          const busy = tile.state === 'uploading' || tile.state === 'processing' || tile.state === 'loading';

          return (
            <TouchableRipple
              key={tile.id}
              onPress={() => {
                if (!isRevealed) {
                  setRevealed((prev) => ({ ...prev, [tile.id]: true }));
                  return;
                }
                if (restricted || broken || busy) return;
                onTilePress?.(tile, index);
                openViewer(tile);
              }}
              disabled={busy}
              // Alt text is the accessible name; position is spoken too.
              accessibilityRole="imagebutton"
              accessibilityLabel={[
                tile.media.type === 'video' ? 'Video' : 'Image',
                `${index + 1} of ${tiles.length}`,
                !isRevealed ? `hidden behind a content warning: ${tile.contentWarning}` : tile.media.alt,
                tile.itemCount && tile.itemCount > 1 ? `${tile.itemCount} items` : undefined,
                restricted ? tile.restrictedReason ?? 'restricted' : undefined,
                broken ? 'media unavailable' : undefined,
                busy ? 'still processing' : undefined,
              ]
                .filter(Boolean)
                .join(', ')}
              style={{ width: tileSize, height: tileSize / aspectRatio, padding: gap / 2 }}
              testID={childTestID(id, `tile-${tile.id}`)}
            >
              <View style={[styles.tile, { backgroundColor: theme.colors.surfaceVariant }]}>
                {isRevealed && !broken && !restricted ? (
                  <Image
                    source={{ uri: tile.media.src }}
                    style={StyleSheet.absoluteFill}
                    resizeMode="cover"
                    onError={() => setFailed((prev) => ({ ...prev, [tile.id]: true }))}
                    accessibilityElementsHidden
                  />
                ) : null}

                {/* Sensitive media stays covered until the viewer chooses. */}
                {!isRevealed ? (
                  <View style={[StyleSheet.absoluteFill, styles.center, { padding: 6 }]}>
                    <Icon source="eye-off-outline" size={18} color={theme.colors.onSurfaceVariant} />
                    <Text
                      variant="labelSmall"
                      numberOfLines={3}
                      style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 2, fontSize: 9 }}
                    >
                      Content warning · tap to show
                    </Text>
                  </View>
                ) : null}

                {restricted ? (
                  <View style={[StyleSheet.absoluteFill, styles.center, { padding: 6 }]}>
                    <Icon source="lock-outline" size={18} color={theme.colors.onSurfaceVariant} />
                    <Text
                      variant="labelSmall"
                      numberOfLines={3}
                      style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', fontSize: 9, marginTop: 2 }}
                    >
                      {tile.restrictedReason ?? 'Restricted'}
                    </Text>
                  </View>
                ) : null}

                {broken ? (
                  <View style={[StyleSheet.absoluteFill, styles.center, { padding: 6 }]}>
                    <Icon source="image-off-outline" size={18} color={theme.colors.onSurfaceVariant} />
                    <Text
                      variant="labelSmall"
                      numberOfLines={2}
                      style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', fontSize: 9, marginTop: 2 }}
                    >
                      Unavailable
                    </Text>
                  </View>
                ) : null}

                {busy ? (
                  <View style={[StyleSheet.absoluteFill, styles.center]}>
                    <ActivityIndicator size={16} />
                    {tile.state === 'uploading' && tile.uploadProgress != null ? (
                      <ProgressBar
                        progress={tile.uploadProgress}
                        style={{ height: 2, width: '70%', marginTop: 6, borderRadius: 2 }}
                        accessibilityLabel={`Uploading, ${Math.round(tile.uploadProgress * 100)} percent`}
                      />
                    ) : (
                      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, fontSize: 9, marginTop: 4 }}>
                        Processing
                      </Text>
                    )}
                  </View>
                ) : null}

                {/* Video is marked, never played inside the grid. */}
                {tile.media.type === 'video' && isRevealed && !broken ? (
                  <View style={styles.videoPip}>
                    <Icon source="play" size={12} color="#FFFFFF" />
                    {tile.durationLabel ? (
                      <Text variant="labelSmall" style={styles.pipText}>
                        {tile.durationLabel}
                      </Text>
                    ) : null}
                  </View>
                ) : null}

                {tile.itemCount && tile.itemCount > 1 ? (
                  <View style={styles.countPip}>
                    <Icon source="layers-outline" size={11} color="#FFFFFF" />
                    <Text variant="labelSmall" style={styles.pipText}>
                      {tile.itemCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      {/* Full-screen viewer with real previous / next / close controls. */}
      <AppSheet
        visible={viewerIndex != null}
        onDismiss={() => setViewerIndex(null)}
        variant="fullscreen"
        showHandle={false}
        animated={animated}
        testID={childTestID(id, 'viewer')}
      >
        {current ? (
          <View style={[styles.viewer, { backgroundColor: '#000' }]}>
            <View style={[styles.viewerBar, { paddingTop: insets.top + 8, paddingHorizontal: theme.spacing.md }]}>
              <Text variant="labelMedium" style={[styles.onDark, styles.flex]} accessibilityLiveRegion="polite">
                Image {(viewerIndex ?? 0) + 1} of {openable.length}
              </Text>
              {onShare ? (
                <ViewerButton icon="share-variant" label="Share this image" onPress={() => onShare(current)} testID={childTestID(id, 'share')} />
              ) : null}
              {onDownload ? (
                <ViewerButton icon="download" label="Download this image" onPress={() => onDownload(current)} testID={childTestID(id, 'download')} />
              ) : null}
              {onReport ? (
                <ViewerButton icon="flag-outline" label="Report this image" onPress={() => onReport(current)} testID={childTestID(id, 'report')} />
              ) : null}
              <ViewerButton icon="close" label="Close gallery" onPress={() => setViewerIndex(null)} testID={childTestID(id, 'close')} />
            </View>

            <ScrollView
              contentContainerStyle={styles.viewerStage}
              maximumZoomScale={3}
              minimumZoomScale={1}
              centerContent
            >
              {current.state === 'restricted' ? (
                <View style={styles.center}>
                  <Icon source="lock-outline" size={32} color="#FFFFFF" />
                  <Text variant="labelMedium" style={[styles.onDark, { marginTop: 8, textAlign: 'center' }]}>
                    {current.restrictedReason ?? 'This media is restricted'}
                  </Text>
                </View>
              ) : (
                <Image
                  source={{ uri: current.media.src }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                  accessible
                  accessibilityLabel={current.media.alt}
                  onError={() => setFailed((prev) => ({ ...prev, [current.id]: true }))}
                />
              )}
            </ScrollView>

            {/* The alt text is visible here, not only in the a11y tree. */}
            <View style={[styles.caption, { paddingBottom: insets.bottom + 8, paddingHorizontal: theme.spacing.md }]}>
              <Text variant="labelSmall" style={styles.onDarkMuted}>
                {current.media.alt}
              </Text>
            </View>

            <View style={[styles.viewerNav, { paddingBottom: insets.bottom + 12, paddingHorizontal: theme.spacing.md }]}>
              <ViewerButton
                icon="chevron-left"
                label="Previous image"
                disabled={(viewerIndex ?? 0) === 0}
                onPress={() => goTo((viewerIndex ?? 0) - 1)}
                testID={childTestID(id, 'previous')}
              />
              <View style={styles.flex} />
              <ViewerButton
                icon="chevron-right"
                label="Next image"
                disabled={(viewerIndex ?? 0) >= openable.length - 1}
                onPress={() => goTo((viewerIndex ?? 0) + 1)}
                testID={childTestID(id, 'next')}
              />
            </View>
          </View>
        ) : null}
      </AppSheet>
    </View>
  );
});

const ViewerButton = ({
  icon,
  label,
  onPress,
  disabled = false,
  testID,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
}) => (
  <TouchableRipple
    onPress={onPress}
    disabled={disabled}
    borderless
    style={[styles.viewerButton, { opacity: disabled ? 0.35 : 1 }]}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
    testID={testID}
  >
    <Icon source={icon} size={20} color="#FFFFFF" />
  </TouchableRipple>
);

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { flex: 1, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  videoPip: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  countPip: {
    position: 'absolute',
    top: 4,
    right: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  pipText: { color: '#FFFFFF', fontSize: 9 },
  viewer: { flex: 1 },
  viewerBar: { flexDirection: 'row', alignItems: 'center', paddingBottom: 8 },
  viewerStage: { flexGrow: 1, justifyContent: 'center' },
  viewerImage: { width: '100%', height: 400 },
  caption: { paddingVertical: 6 },
  viewerNav: { flexDirection: 'row', alignItems: 'center' },
  viewerButton: { padding: 10, borderRadius: 24 },
  onDark: { color: '#FFFFFF' },
  onDarkMuted: { color: 'rgba(255,255,255,0.75)' },
  flex: { flex: 1 },
});
