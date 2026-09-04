import React, { memo, useState } from 'react';
import { Image, ScrollView, StyleSheet, View } from 'react-native';
import { Divider, Icon, Text, TouchableRipple } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppCard } from '@ui/molecules/AppCard';
import { RatingStars } from '@ui/atoms/RatingStars';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID, formatRelativeDate } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useShopTheme } from '../theme/ecommerceTokens';
import type { Review } from '../types/domain';

const FIT_COPY = {
  small: 'Runs small',
  trueToSize: 'True to size',
  large: 'Runs large',
} as const;

export interface ReviewCardProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated' | 'entering' | 'index'> {
  review: Review;
  locale?: string;
  /** Characters shown before "Read more". */
  truncateAt?: number;
  onHelpfulPress?: (review: Review) => void;
  helpfulMarked?: boolean;
  onReport?: (review: Review) => void;
  onTranslate?: (review: Review) => void;
  onMediaPress?: (review: Review, mediaIndex: number) => void;
}

/**
 * A single review.
 *
 * Expansion is in-place and the card keeps its own footer, so "Read more" never
 * reflows the surrounding list unpredictably. Removed reviews render a tombstone
 * rather than disappearing, which is what moderation transparency requires.
 */
export const ReviewCard = memo(function ReviewCard({
  review,
  locale = 'en-IN',
  truncateAt = 220,
  onHelpfulPress,
  helpfulMarked = false,
  onReport,
  onTranslate,
  onMediaPress,
  animated = true,
  entering = false,
  index = 0,
  style,
  containerStyle,
  testID,
}: ReviewCardProps) {
  const theme = useAppTheme();
  const shop = useShopTheme();
  const motion = useMotion({ animated });
  const [expanded, setExpanded] = useState(false);

  const id = testID ?? `review-${review.id}`;
  const long = review.body.length > truncateAt;
  const body = expanded || !long ? review.body : `${review.body.slice(0, truncateAt).trimEnd()}…`;

  if (review.moderationStatus === 'removed') {
    return (
      <AppCard variant="outlined" containerStyle={containerStyle} testID={id}>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          This review was removed because it did not meet our review guidelines.
        </Text>
      </AppCard>
    );
  }

  return (
    <Animated.View
      entering={motion.entering(entering, index)}
      layout={motion.layout}
      style={containerStyle}
      testID={id}
    >
      <AppCard variant="outlined" style={style}>
        <View style={[styles.headerRow, { gap: theme.spacing.sm }]}>
          <RatingStars value={review.rating} readonly size="sm" entering={false} />
          {review.verified ? (
            <View style={[styles.verified, { gap: 2 }]}>
              <Icon source="check-decagram" size={14} color={shop.colors.savings} />
              <Text variant="labelSmall" style={{ color: shop.colors.savings }}>
                Verified purchase
              </Text>
            </View>
          ) : null}
          <View style={styles.flex} />
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatRelativeDate(review.createdAt, locale)}
          </Text>
        </View>

        {review.title ? (
          <Text variant="titleSmall" style={{ marginTop: theme.spacing.xs }}>
            {review.title}
          </Text>
        ) : null}

        <Text variant="bodyMedium" style={{ marginTop: 2 }} testID={childTestID(id, 'body')}>
          {body}
        </Text>

        {long ? (
          <Text
            variant="labelMedium"
            onPress={() => setExpanded((prev) => !prev)}
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            style={{ color: theme.colors.primary, marginTop: 4 }}
            testID={childTestID(id, 'expand')}
          >
            {expanded ? 'Read less' : 'Read more'}
          </Text>
        ) : null}

        {review.translatedFrom ? (
          <Text
            variant="labelSmall"
            onPress={onTranslate ? () => onTranslate(review) : undefined}
            accessibilityRole={onTranslate ? 'button' : 'text'}
            style={{ color: theme.colors.primary, marginTop: 4 }}
          >
            Translated from {review.translatedFrom} · Show original
          </Text>
        ) : null}

        {review.media?.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: theme.spacing.sm, marginTop: theme.spacing.sm }}
          >
            {review.media.map((asset, mediaIndex) => (
              <TouchableRipple
                key={asset.id}
                onPress={onMediaPress ? () => onMediaPress(review, mediaIndex) : undefined}
                accessibilityRole="imagebutton"
                accessibilityLabel={asset.alt}
                borderless
                style={{ borderRadius: theme.radii.md }}
                testID={childTestID(id, `media-${mediaIndex}`)}
              >
                <View
                  style={[
                    styles.media,
                    { borderRadius: theme.radii.md, backgroundColor: theme.colors.surfaceVariant },
                  ]}
                >
                  <Image source={{ uri: asset.src }} style={styles.mediaImage} resizeMode="cover" />
                  {asset.type === 'video' ? (
                    <View style={styles.mediaBadge}>
                      <Icon source="play-circle" size={20} color="#FFFFFF" />
                    </View>
                  ) : null}
                </View>
              </TouchableRipple>
            ))}
          </ScrollView>
        ) : null}

        {review.variantContext ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.xs }}>
            {Object.entries(review.variantContext)
              .map(([key, value]) => `${key}: ${value}`)
              .join(' · ')}
          </Text>
        ) : null}

        {/* Fit feedback only when the reviewer supplied it — never inferred. */}
        {review.fitFeedback ? (
          <Text variant="labelSmall" style={{ color: shop.colors.deliveryStandard, marginTop: 2 }}>
            Fit: {FIT_COPY[review.fitFeedback]}
          </Text>
        ) : null}

        {review.merchantResponse ? (
          <View
            style={[
              styles.response,
              { backgroundColor: theme.colors.surfaceVariant, borderRadius: theme.radii.md, padding: theme.spacing.sm, marginTop: theme.spacing.sm },
            ]}
          >
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Response from the seller
            </Text>
            <Text variant="bodySmall" style={{ marginTop: 2 }}>
              {review.merchantResponse.body}
            </Text>
          </View>
        ) : null}

        <Divider style={{ marginVertical: theme.spacing.sm }} />

        <View style={[styles.footerRow, { gap: theme.spacing.md }]}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {review.authorLabel}
          </Text>
          <View style={styles.flex} />

          {onHelpfulPress ? (
            <Text
              variant="labelSmall"
              onPress={() => onHelpfulPress(review)}
              accessibilityRole="button"
              accessibilityState={{ selected: helpfulMarked }}
              accessibilityLabel={`Mark this review helpful. ${review.helpfulCount ?? 0} people found it helpful.`}
              style={{ color: helpfulMarked ? theme.colors.primary : theme.colors.onSurfaceVariant }}
              testID={childTestID(id, 'helpful')}
            >
              Helpful{review.helpfulCount ? ` (${review.helpfulCount})` : ''}
            </Text>
          ) : null}

          {onReport ? (
            <Text
              variant="labelSmall"
              onPress={() => onReport(review)}
              accessibilityRole="button"
              accessibilityLabel="Report this review"
              style={{ color: theme.colors.onSurfaceVariant }}
              testID={childTestID(id, 'report')}
            >
              Report
            </Text>
          ) : null}
        </View>

        {review.moderationStatus === 'pending' ? (
          <Text variant="labelSmall" style={{ color: shop.colors.lowStock, marginTop: 4 }}>
            Awaiting moderation — only you can see this.
          </Text>
        ) : null}
      </AppCard>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  verified: { flexDirection: 'row', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  media: { width: 64, height: 64, overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  mediaBadge: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  response: {},
  flex: { flex: 1 },
});
