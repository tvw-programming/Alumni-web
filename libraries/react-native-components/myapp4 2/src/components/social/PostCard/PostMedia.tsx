import React, { memo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';

import { useSocialTheme } from '../theme/socialTokens';
import type { MediaAsset } from '../types/domain';

export interface PostMediaProps {
  media: MediaAsset[];
  aspectRatio?: number;
  /** Blurs the media until the viewer opts in. */
  contentWarning?: string;
  onPress?: (index: number) => void;
  /** `static` never plays video; `interactive` allows tap-to-play. */
  mediaMode?: 'auto' | 'static' | 'interactive';
  testID?: string;
}

/**
 * Post media — single, carousel or video.
 *
 * Video is never autoplayed: it shows a play affordance and waits. A content
 * warning covers the media until the viewer chooses to reveal it, which is the
 * only pattern that respects people who did not ask to see it.
 */
export const PostMedia = memo(function PostMedia({
  media,
  aspectRatio,
  contentWarning,
  onPress,
  mediaMode = 'auto',
  testID,
}: PostMediaProps) {
  const theme = useAppTheme();
  const social = useSocialTheme();
  const { width } = useWindowDimensions();

  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [revealed, setRevealed] = useState(!contentWarning);

  const ratio = aspectRatio ?? social.layout.postMediaAspectRatio;
  const pageWidth = width - theme.spacing.md * 2;

  if (media.length === 0) return null;

  if (!revealed) {
    return (
      <View
        style={[styles.warning, { aspectRatio: ratio, backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md }]}
        testID={childTestID(testID, 'warning')}
      >
        <Icon source="eye-off-outline" size={28} color={theme.colors.onSurfaceVariant} />
        <Text variant="labelMedium" style={{ marginTop: 6, textAlign: 'center' }}>
          Content warning
        </Text>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 2, paddingHorizontal: 24 }}
        >
          {contentWarning}
        </Text>
        <TouchableRipple
          onPress={() => setRevealed(true)}
          style={{ marginTop: 10, borderRadius: theme.radii.pill }}
          accessibilityRole="button"
          accessibilityLabel={`Show media. Content warning: ${contentWarning}`}
          testID={childTestID(testID, 'reveal')}
        >
          <View
            style={{
              paddingHorizontal: theme.spacing.md,
              paddingVertical: 6,
              borderRadius: theme.radii.pill,
              borderWidth: 1,
              borderColor: theme.colors.outline,
            }}
          >
            <Text variant="labelMedium">Show anyway</Text>
          </View>
        </TouchableRipple>
      </View>
    );
  }

  const renderItem = (asset: MediaAsset, position: number) => (
    <TouchableRipple
      key={asset.id}
      onPress={onPress ? () => onPress(position) : undefined}
      disabled={!onPress}
      accessibilityRole="imagebutton"
      // The alt text is the accessible name; "image" alone is useless.
      accessibilityLabel={
        asset.type === 'video' ? `Video: ${asset.alt}. Double tap to play.` : asset.alt
      }
      style={{ width: media.length > 1 ? pageWidth : '100%' }}
      testID={childTestID(testID, `item-${position}`)}
    >
      <View style={[styles.item, { aspectRatio: ratio, backgroundColor: theme.colors.surfaceVariant }]}>
        {failed[asset.id] ? (
          <View style={[StyleSheet.absoluteFill, styles.center, { padding: 16 }]}>
            <Icon source="image-off-outline" size={26} color={theme.colors.onSurfaceVariant} />
            <Text
              variant="labelSmall"
              numberOfLines={3}
              style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center', marginTop: 4 }}
            >
              {asset.alt}
            </Text>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 2 }}>
              Media unavailable
            </Text>
          </View>
        ) : (
          <>
            <Image
              source={{ uri: asset.src }}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
              onLoad={() => setLoaded((prev) => ({ ...prev, [asset.id]: true }))}
              onError={() => setFailed((prev) => ({ ...prev, [asset.id]: true }))}
              accessibilityElementsHidden
            />
            {!loaded[asset.id] ? <SkeletonLoader shape="rect" containerStyle={StyleSheet.absoluteFillObject} /> : null}
          </>
        )}

        {/* Video shows a play control and waits — never autoplay. */}
        {asset.type === 'video' && mediaMode !== 'static' ? (
          <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
            <View style={[styles.playPill, { backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: theme.radii.pill }]}>
              <Icon source="play" size={22} color="#FFFFFF" />
            </View>
          </View>
        ) : null}
      </View>
    </TouchableRipple>
  );

  if (media.length === 1) {
    return (
      <View style={styles.single} testID={testID}>
        {renderItem(media[0] as MediaAsset, 0)}
      </View>
    );
  }

  return (
    <View testID={testID}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))}
      >
        {media.map(renderItem)}
      </ScrollView>

      {/* Position indicator is text as well as dots. */}
      <View style={[styles.counter, { backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: theme.radii.pill }]}>
        <Text variant="labelSmall" style={{ color: '#FFFFFF' }}>
          {index + 1}/{media.length}
        </Text>
      </View>

      <View style={[styles.dots, { gap: 4 }]} accessibilityElementsHidden>
        {media.map((asset, position) => (
          <View
            key={asset.id}
            style={{
              width: position === index ? 14 : 5,
              height: 5,
              borderRadius: theme.radii.pill,
              backgroundColor: position === index ? social.colors.statusUnread : theme.colors.outlineVariant,
            }}
          />
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  single: { width: '100%' },
  item: { width: '100%', overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  playPill: { padding: 12 },
  warning: { alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', top: 8, right: 8, paddingHorizontal: 8, paddingVertical: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginTop: 6 },
});
