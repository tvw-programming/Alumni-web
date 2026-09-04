import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Chip, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { ContentPoster } from '../types/domain';
import { WatchlistToggle } from '../WatchlistAndRating/WatchlistToggle';
import { PosterMedia } from './PosterMedia';

const BADGE_COLOR_KEY: Record<string, 'newBadge' | 'fourKBadge' | 'liveBadge'> = {
  New: 'newBadge',
  '4K': 'fourKBadge',
  Live: 'liveBadge',
};

export interface ContentPosterCardProps extends StyleEscapeHatches {
  content: ContentPoster;
  onPress: (content: ContentPoster) => void;
  onWatchlistToggle?: (content: ContentPoster) => void;
  onMore?: (content: ContentPoster) => void;
}

/**
 * Availability is context-aware, not universal — a title restricted for this
 * profile or unavailable in this region renders that fact plainly, it never
 * pretends every title is visible to every profile.
 */
export const ContentPosterCard = ({ content, onPress, onWatchlistToggle, onMore, style, containerStyle, testID }: ContentPosterCardProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? `poster-${content.id}`;
  const [menuVisible, setMenuVisible] = useState(false);

  const restricted = content.availability?.status === 'restricted';
  const unavailable = content.availability?.status === 'unavailable' || content.availability?.status === 'expired';

  const a11yLabel = `${content.title}${content.metadata ? `, ${content.metadata}` : ''}${content.maturityRating ? `, rated ${content.maturityRating}` : ''}${
    restricted ? ', restricted for this profile' : unavailable ? `, ${content.availability?.status}` : ''
  }`;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <TouchableRipple
        onPress={() => onPress(content)}
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        style={{ borderRadius: theme.radii.sm, overflow: 'hidden' }}
      >
        <PosterMedia
          image={content.image}
          aspectRatio={content.aspectRatio}
          testID={childTestID(id, 'media')}
          overlay={
            <>
              {content.badges && content.badges.length > 0 ? (
                <View style={styles.badgeRow} pointerEvents="none">
                  {content.badges.slice(0, 2).map((badge) => (
                    <View key={badge} style={[styles.badge, { backgroundColor: media.colors[BADGE_COLOR_KEY[badge] ?? 'newBadge'] }]}>
                      <Text variant="labelSmall" style={{ color: '#0B0B0F', fontWeight: '700' }}>
                        {badge}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {restricted || unavailable ? (
                <View style={[StyleSheet.absoluteFillObject, styles.restrictedOverlay, { backgroundColor: media.colors.overlay }]} pointerEvents="none">
                  <Text variant="labelSmall" style={{ color: '#FFFFFF', textAlign: 'center', paddingHorizontal: 8 }}>
                    {restricted ? 'Restricted for this profile' : content.availability?.status === 'expired' ? 'No longer available' : 'Not available in your region'}
                  </Text>
                </View>
              ) : null}

              {onWatchlistToggle ? (
                <WatchlistToggle
                  title={content.title}
                  saved={content.watchlistState === 'saved'}
                  loading={content.watchlistState === 'loading'}
                  onToggle={() => onWatchlistToggle(content)}
                  containerStyle={styles.watchlistPosition}
                />
              ) : null}
            </>
          }
        />
      </TouchableRipple>

      <View style={{ paddingTop: 6, gap: 2 }}>
        <View style={styles.row}>
          <Text variant="bodyMedium" numberOfLines={1} style={{ color: theme.colors.onSurface, flex: 1 }}>
            {content.title}
          </Text>
          {onMore ? (
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${content.title}`} style={styles.noMargin} />}
            >
              <Menu.Item
                onPress={() => {
                  setMenuVisible(false);
                  onMore(content);
                }}
                title="View details"
                leadingIcon="information-outline"
              />
            </Menu>
          ) : null}
        </View>
        <View style={styles.row}>
          {content.metadata ? (
            <Text variant="labelSmall" style={{ color: media.colors.onSurfaceVariant, flex: 1 }} numberOfLines={1}>
              {content.metadata}
            </Text>
          ) : null}
          {content.maturityRating ? (
            <Chip compact mode="outlined" style={styles.ratingChip} textStyle={styles.ratingChipText}>
              {content.maturityRating}
            </Chip>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  badgeRow: { position: 'absolute', top: 6, left: 6, flexDirection: 'row', gap: 4 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  restrictedOverlay: { alignItems: 'center', justifyContent: 'center' },
  watchlistPosition: { position: 'absolute', top: 4, right: 4, margin: 0 },
  noMargin: { margin: 0 },
  ratingChip: { height: 22 },
  ratingChipText: { fontSize: 10, marginVertical: 0, lineHeight: 12 },
});
