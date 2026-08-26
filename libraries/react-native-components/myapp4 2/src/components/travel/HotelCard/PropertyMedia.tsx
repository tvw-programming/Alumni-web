import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';
import type { ImageAsset } from '@ui/primitives/media';

import { useTravelTheme } from '../theme/travelTokens';

export interface PropertyMediaProps {
  image?: ImageAsset;
  overlay?: React.ReactNode;
  testID?: string;
}

/** Loading, loaded, and broken-image states — a broken image never collapses the card. */
export const PropertyMedia = memo(function PropertyMedia({ image, overlay, testID }: PropertyMediaProps) {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(image?.uri ? 'loading' : 'error');

  return (
    <View style={[styles.root, { height: travel.layout.propertyImageHeight, backgroundColor: theme.colors.surfaceVariant }]} testID={testID}>
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

      {status === 'loading' ? <SkeletonLoader shape="rect" height={undefined} containerStyle={StyleSheet.absoluteFillObject} /> : null}

      {status === 'error' ? (
        <View style={styles.fallback} testID={testID ? `${testID}-fallback` : undefined}>
          <Icon source="image-off-outline" size={28} color={theme.colors.onSurfaceVariant} />
          <Text variant="labelSmall" numberOfLines={2} style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
            {image?.alt ?? 'Image unavailable'}
          </Text>
        </View>
      ) : null}

      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 8 },
  overlay: { position: 'absolute', top: 8, right: 8 },
});
