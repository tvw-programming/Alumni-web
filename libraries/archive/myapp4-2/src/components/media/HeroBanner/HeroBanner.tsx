import React, { useState } from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { Chip, Icon, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { HeroContent, HeroPrimaryAction, WatchlistState } from '../types/domain';
import { WatchlistToggle } from '../WatchlistAndRating/WatchlistToggle';

const ACTION_LABEL: Record<HeroPrimaryAction, { label: string; icon: string }> = {
  play: { label: 'Play', icon: 'play' },
  resume: { label: 'Resume', icon: 'play' },
  watchTrailer: { label: 'Watch trailer', icon: 'movie-open-play-outline' },
  subscribe: { label: 'Upgrade to watch', icon: 'lock-outline' },
};

export interface HeroBannerProps extends StyleEscapeHatches {
  content: HeroContent;
  primaryAction: HeroPrimaryAction;
  watchlistState?: WatchlistState;
  loading?: boolean;
  errorMessage?: string;
  onPrimaryAction: (content: HeroContent) => void;
  onWatchlistToggle?: (content: HeroContent) => void;
}

/**
 * Renders exactly one content item and accepts explicit state — carousel
 * paging, autoplay timing, and trailer buffering all live in a separate
 * controller. Never autoplays sound; a caller wiring a trailer must mute it
 * before this component ever renders "playing."
 */
export const HeroBanner = ({ content, primaryAction, watchlistState = 'notSaved', loading = false, errorMessage, onPrimaryAction, onWatchlistToggle, style, containerStyle, testID }: HeroBannerProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? `hero-${content.id}`;
  const [imgError, setImgError] = useState(false);
  const action = ACTION_LABEL[primaryAction];

  if (loading) {
    return (
      <View style={[styles.root, { height: media.layout.heroHeight, backgroundColor: media.colors.surfaceVariant }, containerStyle, style]} testID={childTestID(id, 'loading')}>
        <View style={styles.contentBlock}>
          <SkeletonLoader shape="text" lines={1} height={28} containerStyle={{ width: '60%', marginBottom: 8 }} />
          <SkeletonLoader shape="text" lines={2} containerStyle={{ width: '80%' }} />
        </View>
      </View>
    );
  }

  const inner = (
    <View style={[StyleSheet.absoluteFillObject, styles.scrim, { backgroundColor: media.colors.overlay }]}>
      <View style={styles.contentBlock}>
        {content.badges && content.badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {content.badges.map((badge) => (
              <Chip key={badge} compact mode="flat" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} textStyle={{ color: '#FFFFFF', fontSize: 11 }}>
                {badge}
              </Chip>
            ))}
          </View>
        ) : null}

        <Text variant="headlineSmall" style={styles.title} numberOfLines={2}>
          {content.title}
        </Text>

        <View style={styles.metaRow}>
          {content.metadata ? (
            <Text variant="labelMedium" style={styles.metaText}>
              {content.metadata}
            </Text>
          ) : null}
          {content.maturityRating ? (
            <Chip compact mode="outlined" style={{ borderColor: 'rgba(255,255,255,0.4)' }} textStyle={{ color: '#FFFFFF', fontSize: 10 }}>
              {content.maturityRating}
            </Chip>
          ) : null}
        </View>

        {content.description ? (
          <Text variant="bodySmall" style={styles.description} numberOfLines={3}>
            {content.description}
          </Text>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorRow}>
            <Icon source="alert-circle-outline" size={14} color="#FFFFFF" />
            <Text variant="labelSmall" style={{ color: '#FFFFFF', marginLeft: 6 }}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <AppButton variant="primary" size="lg" onPress={() => onPrimaryAction(content)} testID={childTestID(id, 'primary')}>
            {action.label}
          </AppButton>
          {onWatchlistToggle ? (
            <WatchlistToggle title={content.title} saved={watchlistState === 'saved'} loading={watchlistState === 'loading'} onToggle={() => onWatchlistToggle(content)} />
          ) : null}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { height: media.layout.heroHeight }, containerStyle, style]} testID={id}>
      {content.backdrop?.uri && !imgError ? (
        <ImageBackground source={{ uri: content.backdrop.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setImgError(true)} accessibilityElementsHidden>
          {inner}
        </ImageBackground>
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: media.colors.surfaceVariant }]}>{inner}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  scrim: { justifyContent: 'flex-end' },
  contentBlock: { padding: 20, gap: 6 },
  badgeRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  title: { color: '#FFFFFF', fontWeight: '700' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaText: { color: 'rgba(255,255,255,0.85)' },
  description: { color: 'rgba(255,255,255,0.85)' },
  errorRow: { flexDirection: 'row', alignItems: 'center' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
});
