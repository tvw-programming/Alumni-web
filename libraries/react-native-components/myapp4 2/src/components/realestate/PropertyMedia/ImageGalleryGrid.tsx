import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { usePropertyTheme } from '../theme/realestateTokens';
import type { GalleryImage } from '../types/domain';

export interface ImageGalleryGridProps extends StyleEscapeHatches {
  images: GalleryImage[];
  onOpen?: (imageId: string) => void;
}

const TYPE_BADGE: Partial<Record<NonNullable<GalleryImage['type']>, { icon: string; label: string }>> = {
  video: { icon: 'play-circle-outline', label: 'Video' },
  tour: { icon: 'rotate-3d-variant', label: '3D tour' },
};

/**
 * Every tile ships real alt text and, on open, a fullscreen viewer whose
 * position is preserved on return — "1 of 43 photos" is always stated as
 * text, never implied only by dot indicators.
 */
export const ImageGalleryGrid = ({ images, onOpen, style, containerStyle, testID }: ImageGalleryGridProps) => {
  const theme = useAppTheme();
  const realestate = usePropertyTheme();
  const id = testID ?? 'image-gallery-grid';
  const [fullscreenIndex, setFullscreenIndex] = useState<number | null>(null);
  const [brokenIds, setBrokenIds] = useState<string[]>([]);

  const openAt = (index: number) => {
    setFullscreenIndex(index);
    onOpen?.(images[index]!.id);
  };

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.grid}>
        {images.map((item, index) => {
          const broken = brokenIds.includes(item.id) || !item.image.uri;
          const badge = item.type ? TYPE_BADGE[item.type] : undefined;
          return (
            <TouchableRipple key={item.id} onPress={() => openAt(index)} accessibilityRole="button" accessibilityLabel={`${item.image.alt}${item.room ? `, ${item.room}` : ''}${badge ? `, ${badge.label}` : ''}`} style={styles.tile} testID={childTestID(id, item.id)}>
              <View style={[styles.tileInner, { backgroundColor: realestate.colors.surfaceVariant, borderRadius: theme.radii.sm }]}>
                {!broken ? (
                  <Image source={{ uri: item.image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" onError={() => setBrokenIds((prev) => [...prev, item.id])} accessibilityElementsHidden />
                ) : (
                  <View style={styles.fallback}>
                    <Icon source="image-off-outline" size={18} color={realestate.colors.onSurfaceVariant} />
                  </View>
                )}
                {badge ? (
                  <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Icon source={badge.icon} size={11} color="#FFFFFF" />
                    <Text variant="labelSmall" style={{ color: '#FFFFFF', marginLeft: 3 }}>
                      {badge.label}
                    </Text>
                  </View>
                ) : null}
                {item.room ? (
                  <View style={[styles.roomLabel, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
                    <Text variant="labelSmall" style={{ color: '#FFFFFF' }} numberOfLines={1}>
                      {item.room}
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableRipple>
          );
        })}
      </View>

      <AppSheet visible={fullscreenIndex != null} onDismiss={() => setFullscreenIndex(null)} variant="fullscreen" title={fullscreenIndex != null ? `${fullscreenIndex + 1} of ${images.length} photos` : undefined} scrollable={false} testID={childTestID(id, 'fullscreen')}>
        {fullscreenIndex != null ? (
          <View style={styles.fullscreenBody}>
            <Image source={{ uri: images[fullscreenIndex]!.image.uri }} style={styles.fullscreenImage} resizeMode="contain" accessibilityLabel={images[fullscreenIndex]!.image.alt} />
            <View style={[styles.row, { padding: theme.spacing.md }]}>
              <TouchableRipple onPress={() => setFullscreenIndex((i) => (i! > 0 ? i! - 1 : images.length - 1))} accessibilityRole="button" accessibilityLabel="Previous photo" testID={childTestID(id, 'prev')}>
                <Icon source="chevron-left" size={28} color={theme.colors.onSurface} />
              </TouchableRipple>
              <Text variant="labelMedium" style={styles.flex}>
                {images[fullscreenIndex]!.image.alt}
              </Text>
              <TouchableRipple onPress={() => setFullscreenIndex((i) => (i! < images.length - 1 ? i! + 1 : 0))} accessibilityRole="button" accessibilityLabel="Next photo" testID={childTestID(id, 'next')}>
                <Icon source="chevron-right" size={28} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
          </View>
        ) : null}
      </AppSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tile: { width: '32%', aspectRatio: 1 },
  tileInner: { flex: 1, overflow: 'hidden' },
  fallback: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 4, left: 4, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  roomLabel: { position: 'absolute', bottom: 4, left: 4, right: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  fullscreenBody: { flex: 1, justifyContent: 'center' },
  fullscreenImage: { width: '100%', flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
});
