import React, { forwardRef, useCallback, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Icon, IconButton, Text, TouchableRipple } from 'react-native-paper';

import { AppSheet } from '@ui/organisms/AppSheet';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useControllableState, useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { GalleryAsset } from '../types/domain';

export interface ThumbnailStripProps {
  assets: GalleryAsset[];
  activeIndex: number;
  onSelect: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Dots for narrow screens, thumbnails otherwise. */
  mode?: 'thumbnails' | 'dots';
  testID?: string;
}

/**
 * Navigation for the gallery, as a real list of buttons.
 *
 * Rendered as `tablist`/`tab` so a screen reader can jump straight to image 4
 * rather than swiping through a carousel it cannot see.
 */
export const ThumbnailStrip = ({
  assets,
  activeIndex,
  onSelect,
  orientation = 'horizontal',
  mode = 'thumbnails',
  testID,
}: ThumbnailStripProps) => {
  const theme = useAppTheme();
  const shop = useShopTheme();

  if (mode === 'dots') {
    return (
      <View style={[styles.dots, { gap: theme.spacing.xs }]} accessibilityRole="tablist" testID={testID}>
        {assets.map((asset, index) => (
          <TouchableRipple
            key={asset.id}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected: index === activeIndex }}
            accessibilityLabel={`Image ${index + 1} of ${assets.length}`}
            borderless
            style={{ borderRadius: theme.radii.pill }}
          >
            <View
              style={{
                width: index === activeIndex ? 18 : 6,
                height: 6,
                borderRadius: theme.radii.pill,
                backgroundColor: index === activeIndex ? theme.colors.primary : theme.colors.outlineVariant,
              }}
            />
          </TouchableRipple>
        ))}
      </View>
    );
  }

  const Container = orientation === 'vertical' ? View : ScrollView;

  return (
    <Container
      horizontal={orientation === 'horizontal'}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={orientation === 'horizontal' ? { gap: theme.spacing.sm, paddingHorizontal: theme.spacing.md } : undefined}
      style={orientation === 'vertical' ? { gap: theme.spacing.sm } : undefined}
      accessibilityRole="tablist"
      testID={testID}
    >
      {assets.map((asset, index) => {
        const selected = index === activeIndex;
        return (
          <TouchableRipple
            key={asset.id}
            onPress={() => onSelect(index)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={`${asset.type === 'video' ? 'Video' : 'Image'} ${index + 1} of ${assets.length}: ${asset.alt}`}
            style={[
              styles.thumb,
              {
                width: shop.layout.thumbnailSize,
                height: shop.layout.thumbnailSize,
                borderRadius: theme.radii.md,
                borderWidth: selected ? 2 : 1,
                borderColor: selected ? shop.colors.swatchSelected : shop.colors.swatchBorder,
                backgroundColor: theme.colors.surfaceVariant,
              },
            ]}
            testID={childTestID(testID, `thumb-${index}`)}
          >
            <View style={styles.fill}>
              {asset.thumbnail || asset.src ? (
                <Image source={{ uri: asset.thumbnail ?? asset.src }} style={styles.fill} resizeMode="cover" />
              ) : null}
              {asset.type !== 'image' ? (
                <View style={styles.thumbBadge}>
                  <Icon source={asset.type === 'video' ? 'play-circle' : 'rotate-3d-variant'} size={16} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
          </TouchableRipple>
        );
      })}
    </Container>
  );
};

export interface ImageCarouselProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  assets: GalleryAsset[];
  activeIndex?: number;
  defaultIndex?: number;
  onChange?: (index: number) => void;
  aspectRatio?: number;
  enableFullscreen?: boolean;
  thumbnails?: 'thumbnails' | 'dots' | 'none';
  thumbnailOrientation?: 'horizontal' | 'vertical';
  /** Custom asset renderer — for video players or 360 viewers. */
  renderAsset?: (asset: GalleryAsset, index: number) => React.ReactNode;
}

/**
 * Product gallery.
 *
 * Never autoplays: rotating product imagery is both a WCAG problem and a
 * usability one. Navigation is swipe *plus* an explicit thumbnail list, so the
 * gallery is never gesture-only.
 */
export const ImageCarousel = forwardRef<View, ImageCarouselProps>(function ImageCarousel(
  {
    assets,
    activeIndex,
    defaultIndex = 0,
    onChange,
    aspectRatio,
    enableFullscreen = true,
    thumbnails = 'thumbnails',
    thumbnailOrientation = 'horizontal',
    renderAsset,
    animated = true,
    style,
    containerStyle,
    testID,
  },
  ref,
) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  const [index, setIndex] = useControllableState<number>({
    value: activeIndex,
    defaultValue: defaultIndex,
    onChange,
  });

  const ratio = aspectRatio ?? shop.layout.productMediaAspectRatio;
  const pageWidth = width - theme.spacing.md * 2;

  const select = useCallback(
    (next: number) => {
      setIndex(next);
      scrollRef.current?.scrollTo({ x: next * pageWidth, animated: motion.enabled });
      const asset = assets[next];
      // Announce the change — a silent image swap is invisible to a screen reader.
      if (asset) AccessibilityInfo.announceForAccessibility(`Image ${next + 1} of ${assets.length}: ${asset.alt}`);
    },
    [assets, motion.enabled, pageWidth, setIndex],
  );

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const next = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
      if (next !== index) setIndex(next);
    },
    [index, pageWidth, setIndex],
  );

  const current = assets[index];

  const pages = useMemo(
    () =>
      assets.map((asset, i) => (
        <View key={asset.id} style={{ width: pageWidth, aspectRatio: ratio }}>
          {renderAsset ? (
            renderAsset(asset, i)
          ) : failed[asset.id] ? (
            <View style={[styles.fallback, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Icon source="image-off-outline" size={32} color={theme.colors.onSurfaceVariant} />
              <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}>
                {asset.alt}
              </Text>
            </View>
          ) : (
            <View style={styles.fill}>
              <Image
                source={{ uri: asset.src }}
                style={styles.fill}
                resizeMode="contain"
                accessible
                // Alt text is the image's accessible name.
                accessibilityLabel={asset.alt}
                onLoad={() => setLoaded((prev) => ({ ...prev, [asset.id]: true }))}
                onError={() => setFailed((prev) => ({ ...prev, [asset.id]: true }))}
              />
              {!loaded[asset.id] ? (
                <SkeletonLoader shape="rect" containerStyle={StyleSheet.absoluteFillObject} />
              ) : null}
              {asset.type === 'video' ? (
                <View style={styles.videoBadge}>
                  <Icon source="play-circle" size={44} color="#FFFFFF" />
                </View>
              ) : null}
            </View>
          )}
        </View>
      )),
    [assets, failed, loaded, pageWidth, ratio, renderAsset, theme.colors],
  );

  if (assets.length === 0) {
    return (
      <View
        style={[{ aspectRatio: ratio, backgroundColor: theme.colors.surfaceVariant }, styles.fallback, containerStyle]}
        testID={childTestID(testID, 'empty')}
      >
        <Icon source="image-outline" size={32} color={theme.colors.onSurfaceVariant} />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          No images available
        </Text>
      </View>
    );
  }

  return (
    <View ref={ref} style={containerStyle} testID={testID}>
      <View style={[styles.stage, style]}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScrollEnd}
          testID={childTestID(testID, 'pager')}
        >
          {pages}
        </ScrollView>

        {/* Count indicator, always present. */}
        <View style={[styles.counter, { backgroundColor: theme.colors.backdrop, borderRadius: theme.radii.pill }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurface }}>
            {index + 1}/{assets.length}
          </Text>
        </View>

        {assets.length > 1 ? (
          <>
            <IconButton
              icon="chevron-left"
              mode="contained"
              containerColor={theme.colors.surface}
              size={20}
              disabled={index === 0}
              onPress={() => select(index - 1)}
              accessibilityLabel="Previous image"
              style={[styles.nav, styles.navLeft]}
              testID={childTestID(testID, 'prev')}
            />
            <IconButton
              icon="chevron-right"
              mode="contained"
              containerColor={theme.colors.surface}
              size={20}
              disabled={index === assets.length - 1}
              onPress={() => select(index + 1)}
              accessibilityLabel="Next image"
              style={[styles.nav, styles.navRight]}
              testID={childTestID(testID, 'next')}
            />
          </>
        ) : null}

        {enableFullscreen ? (
          <IconButton
            icon="fullscreen"
            mode="contained"
            containerColor={theme.colors.surface}
            size={18}
            onPress={() => setFullscreen(true)}
            accessibilityLabel="View image full screen"
            style={styles.expand}
            testID={childTestID(testID, 'expand')}
          />
        ) : null}
      </View>

      {thumbnails !== 'none' ? (
        <View style={{ marginTop: theme.spacing.sm }}>
          <ThumbnailStrip
            assets={assets}
            activeIndex={index}
            onSelect={select}
            mode={thumbnails}
            orientation={thumbnailOrientation}
            testID={childTestID(testID, 'thumbs')}
          />
        </View>
      ) : null}

      {enableFullscreen ? (
        <AppSheet
          visible={fullscreen}
          onDismiss={() => setFullscreen(false)}
          variant="fullscreen"
          // Returning from fullscreen keeps the user's selected image.
          title={current ? `${index + 1} of ${assets.length}` : undefined}
          animated={animated}
          testID={childTestID(testID, 'fullscreen')}
        >
          {current ? (
            <View style={styles.fullscreenBody}>
              <Image
                source={{ uri: current.src }}
                style={styles.fullscreenImage}
                resizeMode="contain"
                accessible
                accessibilityLabel={current.alt}
              />
              <ThumbnailStrip assets={assets} activeIndex={index} onSelect={select} mode="thumbnails" />
            </View>
          ) : null}
        </AppSheet>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  stage: { position: 'relative' },
  fill: { width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  counter: { position: 'absolute', bottom: 8, right: 8, paddingHorizontal: 8, paddingVertical: 2 },
  nav: { position: 'absolute', top: '45%' },
  navLeft: { left: 4 },
  navRight: { right: 4 },
  expand: { position: 'absolute', top: 4, right: 4 },
  dots: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  thumb: { overflow: 'hidden' },
  thumbBadge: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  videoBadge: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  fullscreenBody: { flex: 1, gap: 12 },
  fullscreenImage: { flex: 1, width: '100%' },
});
