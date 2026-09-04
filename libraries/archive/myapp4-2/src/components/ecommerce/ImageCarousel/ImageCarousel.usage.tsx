/**
 * USAGE — ImageCarousel + ThumbnailStrip
 *
 * The interesting behaviour is the colour switch: changing variant swaps the
 * asset set. It resets to image 1 only because this gallery genuinely differs;
 * for a variant sharing the same gallery you would keep `activeIndex`.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { GalleryAsset } from '../types/domain';
import { ImageCarousel, ThumbnailStrip } from './ImageCarousel';
import sample from './ImageCarousel.sample.json';

const { galleries } = loadSample<{ galleries: Record<string, GalleryAsset[]> }>(sample);

export const ImageCarouselUsage = () => {
  const theme = useAppTheme();
  const [colour, setColour] = useState<'slate' | 'black'>('slate');
  const [index, setIndex] = useState(0);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        Image URIs are unreachable on purpose — each slide falls back to its alt text, which is exactly what a screen
        reader would announce.
      </Text>

      <SegmentedButtons
        value={colour}
        onValueChange={(next) => {
          setColour(next as 'slate' | 'black');
          setIndex(0);
        }}
        buttons={[
          { value: 'slate', label: 'Slate' },
          { value: 'black', label: 'Black' },
        ]}
      />

      <ImageCarousel
        assets={galleries[colour]!}
        activeIndex={index}
        onChange={setIndex}
        thumbnails="thumbnails"
        enableFullscreen
        testID="gallery-main"
      />

      <Text variant="labelLarge">Dots variant (compact surfaces)</Text>
      <ImageCarousel assets={galleries.slate!} thumbnails="dots" enableFullscreen={false} testID="gallery-dots" />

      <Text variant="labelLarge">Single image — navigation hidden automatically</Text>
      <ImageCarousel assets={galleries.single!} thumbnails="none" testID="gallery-single" />

      <Text variant="labelLarge">No images</Text>
      <ImageCarousel assets={galleries.empty!} testID="gallery-empty" />

      <Text variant="labelLarge">ThumbnailStrip on its own</Text>
      <View style={{ gap: theme.spacing.sm }}>
        <ThumbnailStrip assets={galleries.slate!} activeIndex={index} onSelect={setIndex} mode="thumbnails" />
        <ThumbnailStrip assets={galleries.slate!} activeIndex={index} onSelect={setIndex} mode="dots" />
      </View>
    </ScrollView>
  );
};
