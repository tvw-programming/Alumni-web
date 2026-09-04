import React, { memo, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { Badge, ImageAsset } from '../types/domain';

export interface ProductMediaProps {
  image: ImageAsset;
  aspectRatio?: number;
  badges?: Badge[];
  /** Rendered over the media — usually the wishlist toggle. */
  overlay?: React.ReactNode;
  dimmed?: boolean;
  overlayLabel?: string;
  testID?: string;
}

/**
 * Product imagery with the three states every catalogue needs: loading, loaded,
 * and broken. A broken image must still leave the card usable, so the fallback
 * keeps the same box and shows the alt text rather than collapsing.
 */
export const ProductMedia = memo(function ProductMedia({
  image,
  aspectRatio,
  badges = [],
  overlay,
  dimmed = false,
  overlayLabel,
  testID,
}: ProductMediaProps) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(image.uri ? 'loading' : 'error');

  const ratio = aspectRatio ?? shop.layout.productMediaAspectRatio;

  return (
    <View
      style={[styles.root, { aspectRatio: ratio, backgroundColor: theme.colors.surfaceVariant }]}
      testID={testID}
    >
      {image.uri && status !== 'error' ? (
        <Image
          source={{ uri: image.uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          // Alt text lives on the parent card's accessible name; the raw image
          // is hidden so screen readers do not announce it twice.
          accessibilityElementsHidden
        />
      ) : null}

      {status === 'loading' ? (
        <SkeletonLoader shape="rect" height={undefined} containerStyle={StyleSheet.absoluteFillObject} />
      ) : null}

      {status === 'error' ? (
        <View style={styles.fallback} testID={testID ? `${testID}-fallback` : undefined}>
          <Icon source="image-off-outline" size={28} color={theme.colors.onSurfaceVariant} />
          <Text
            variant="labelSmall"
            numberOfLines={2}
            style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
          >
            {image.alt}
          </Text>
        </View>
      ) : null}

      {dimmed ? (
        <View style={[StyleSheet.absoluteFill, styles.dim]}>
          {overlayLabel ? (
            <Text variant="labelLarge" style={styles.dimLabel}>
              {overlayLabel}
            </Text>
          ) : null}
        </View>
      ) : null}

      {badges.length > 0 ? (
        <View style={[styles.badges, { padding: theme.spacing.xs, gap: 4 }]} pointerEvents="none">
          {badges.map((badge) => (
            <View
              key={badge.key}
              style={{
                backgroundColor:
                  badge.tone === 'sponsored'
                    ? theme.colors.surfaceVariant
                    : badge.tone === 'assured'
                      ? shop.colors.savingsContainer
                      : shop.colors.surfacePromo,
                borderRadius: theme.radii.sm,
                paddingHorizontal: 6,
                paddingVertical: 2,
              }}
            >
              <Text
                variant="labelSmall"
                style={{
                  color:
                    badge.tone === 'sponsored'
                      ? shop.colors.sponsored
                      : badge.tone === 'assured'
                        ? shop.colors.savings
                        : shop.colors.onSurfacePromo,
                }}
              >
                {badge.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {overlay ? <View style={styles.overlay}>{overlay}</View> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  root: { width: '100%', overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', padding: 8 },
  dim: { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  dimLabel: { color: '#FFFFFF' },
  badges: { position: 'absolute', top: 0, left: 0, alignItems: 'flex-start' },
  overlay: { position: 'absolute', top: 4, right: 4 },
});
