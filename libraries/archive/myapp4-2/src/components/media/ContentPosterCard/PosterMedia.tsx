import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import type { ImageAsset } from '@ui/primitives/media';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { PosterAspectRatio } from '../types/domain';

export interface PosterMediaProps {
  image?: ImageAsset;
  aspectRatio?: PosterAspectRatio;
  overlay?: React.ReactNode;
  testID?: string;
}

/** Loading, loaded, and broken-artwork states — a stable box regardless. */
export const PosterMedia = memo(function PosterMedia({ image, aspectRatio = 'portrait', overlay, testID }: PosterMediaProps) {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(image?.uri ? 'loading' : 'error');
  const ratio = aspectRatio === 'portrait' ? media.layout.posterPortraitRatio : media.layout.posterLandscapeRatio;

  return (
    <View style={[styles.root, { aspectRatio: ratio, backgroundColor: media.colors.surfaceVariant }]} testID={testID}>
      {image?.uri && status !== 'error' ? (
        <Image
          source={{ uri: image.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          accessibilityElementsHidden
        />
      ) : null}

      {status === 'loading' ? (
        <View style={styles.fallback}>
          <ActivityIndicator size={20} color={media.colors.onSurfaceVariant} />
        </View>
      ) : null}

      {status === 'error' ? (
        <View style={styles.fallback}>
          <Icon source="movie-open-off-outline" size={24} color={media.colors.onSurfaceVariant} />
          <Text variant="labelSmall" numberOfLines={2} style={{ color: media.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
            {image?.alt ?? 'Artwork unavailable'}
          </Text>
        </View>
      ) : null}

      {overlay ? <View style={StyleSheet.absoluteFill}>{overlay}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 6 },
});
