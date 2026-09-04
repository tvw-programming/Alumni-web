/**
 * USAGE — ReviewCard + RatingBreakdown
 *
 * Tapping a histogram bar filters the list, which is what makes the breakdown
 * useful rather than decorative.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Chip, Text } from 'react-native-paper';

import { AppCard } from '@ui/molecules/AppCard';
import { StateView } from '@ui/molecules/StateView';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RatingBreakdownData, Review } from '../types/domain';
import { RatingBreakdown, type StarKey } from './RatingBreakdown';
import { ReviewCard } from './ReviewCard';
import sample from './Reviews.sample.json';

const data = loadSample<{
  breakdown: RatingBreakdownData;
  attributes: Array<{ id: string; label: string; value: number; scaleLabel?: [string, string] }>;
  reviews: Review[];
}>(sample);

export const ReviewsUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [starFilter, setStarFilter] = useState<StarKey | undefined>();
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [withMedia, setWithMedia] = useState(false);
  const [helpful, setHelpful] = useState<string[]>([]);

  const filtered = useMemo(
    () =>
      data.reviews.filter((review) => {
        if (starFilter && review.rating !== starFilter) return false;
        if (verifiedOnly && !review.verified) return false;
        if (withMedia && !review.media?.length) return false;
        return true;
      }),
    [starFilter, verifiedOnly, withMedia],
  );

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <AppCard variant="outlined" title="Customer reviews">
        <RatingBreakdown
          data={data.breakdown}
          attributes={data.attributes}
          activeStar={starFilter}
          onStarPress={(star) => setStarFilter((prev) => (prev === star ? undefined : star))}
          testID="rating-breakdown"
        />
      </AppCard>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <Chip selected={verifiedOnly} showSelectedCheck={verifiedOnly} onPress={() => setVerifiedOnly((p) => !p)}>
          Verified only
        </Chip>
        <Chip selected={withMedia} showSelectedCheck={withMedia} onPress={() => setWithMedia((p) => !p)}>
          With photos
        </Chip>
        {starFilter ? (
          <Chip icon="close" onPress={() => setStarFilter(undefined)}>
            {starFilter} stars
          </Chip>
        ) : null}
      </View>

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} accessibilityLiveRegion="polite">
        Showing {filtered.length} of {data.reviews.length} reviews
      </Text>

      {filtered.length === 0 ? (
        <StateView
          preset="noResults"
          compact
          title="No reviews match"
          description="Try removing a filter."
          primaryAction={{
            label: 'Clear filters',
            onPress: () => {
              setStarFilter(undefined);
              setVerifiedOnly(false);
              setWithMedia(false);
            },
          }}
        />
      ) : (
        filtered.map((review, index) => (
          <ReviewCard
            key={review.id}
            review={review}
            index={index}
            entering="slideUp"
            helpfulMarked={helpful.includes(review.id)}
            onHelpfulPress={(r) =>
              setHelpful((prev) => (prev.includes(r.id) ? prev.filter((id) => id !== r.id) : [...prev, r.id]))
            }
            onReport={() => toast.show('Thanks — we will take a look')}
            onTranslate={() => toast.show('Showing the original text')}
            onMediaPress={() => toast.show('Opening the photo viewer')}
          />
        ))
      )}

      <Text variant="labelLarge">Compact summary (for a product card or header)</Text>
      <RatingBreakdown data={data.breakdown} variant="compact" testID="rating-compact" />

      <Text variant="labelLarge">Table representation (exact values)</Text>
      <AppCard variant="outlined" padded={false}>
        <RatingBreakdown data={data.breakdown} showTable testID="rating-table" />
      </AppCard>
    </ScrollView>
  );
};
