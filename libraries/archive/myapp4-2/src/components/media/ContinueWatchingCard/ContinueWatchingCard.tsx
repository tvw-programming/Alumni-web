import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, IconButton, Menu, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { ContinueWatchingItem } from '../types/domain';

export interface ContinueWatchingCardProps extends StyleEscapeHatches {
  item: ContinueWatchingItem;
  onResume: (item: ContinueWatchingItem) => void;
  onRemove?: (item: ContinueWatchingItem) => void;
  onStartOver?: (item: ContinueWatchingItem) => void;
}

/**
 * `progressLabel` (e.g. "Watched 32 of 48 min") is required alongside the
 * bar's numeric ratio — the bar communicates position, never an implied
 * exact percentage the backend may not actually track that precisely.
 */
export const ContinueWatchingCard = ({ item, onResume, onRemove, onStartOver, style, containerStyle, testID }: ContinueWatchingCardProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? `continue-watching-${item.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const unavailable = item.availability?.status === 'unavailable' || item.availability?.status === 'expired';

  const a11yLabel = `${item.title}${item.subtitle ? `, ${item.subtitle}` : ''}${item.progressLabel ? `, ${item.progressLabel}` : ''}${unavailable ? ', episode unavailable' : ''}`;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple
        onPress={unavailable ? undefined : () => onResume(item)}
        disabled={unavailable}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={{ borderRadius: theme.radii.sm, overflow: 'hidden' }}
      >
        <View style={[styles.mediaBox, { aspectRatio: media.layout.posterLandscapeRatio, backgroundColor: media.colors.surfaceVariant }]}>
          {item.image?.uri ? (
            <Image source={{ uri: item.image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
          ) : (
            <View style={styles.fallback}>
              <Icon source="movie-open-off-outline" size={22} color={media.colors.onSurfaceVariant} />
            </View>
          )}

          {!unavailable ? (
            <View style={styles.playOverlay} pointerEvents="none">
              <Icon source="play-circle" size={36} color="rgba(255,255,255,0.9)" />
            </View>
          ) : (
            <View style={[StyleSheet.absoluteFillObject, styles.unavailableOverlay, { backgroundColor: media.colors.overlay }]} pointerEvents="none">
              <Text variant="labelSmall" style={{ color: '#FFFFFF' }}>
                Episode unavailable
              </Text>
            </View>
          )}

          {!unavailable ? (
            <View style={styles.progressWrap}>
              <ProgressBar progress={item.progress} color={media.colors.progressValue} style={{ height: 3, backgroundColor: media.colors.progressTrack }} />
            </View>
          ) : null}
        </View>
      </TouchableRipple>

      <View style={styles.row}>
        <View style={styles.flex}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {item.title}
          </Text>
          {item.subtitle ? (
            <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant }} numberOfLines={1}>
              {item.subtitle}
            </Text>
          ) : null}
          {item.progressLabel ? (
            <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant }}>
              {item.progressLabel}
              {item.durationLabel ? ` · ${item.durationLabel}` : ''}
            </Text>
          ) : null}
        </View>

        {onRemove || onStartOver ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${item.title}`} style={styles.noMargin} testID={childTestID(id, 'menu')} />}
          >
            {onStartOver ? (
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  onStartOver(item);
                }}
                title="Start over"
                leadingIcon="restart"
              />
            ) : null}
            {onRemove ? (
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  onRemove(item);
                }}
                title="Remove from Continue Watching"
                leadingIcon="close"
              />
            ) : null}
          </Menu>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mediaBox: { width: '100%', overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  playOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  unavailableOverlay: { alignItems: 'center', justifyContent: 'center' },
  progressWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingTop: 6 },
  flex: { flex: 1 },
  noMargin: { margin: 0 },
});
