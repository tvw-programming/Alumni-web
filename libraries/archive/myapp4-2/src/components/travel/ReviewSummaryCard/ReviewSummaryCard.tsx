import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, ProgressBar, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { ReviewSummary } from '../types/domain';

export interface ReviewSummaryCardProps extends StyleEscapeHatches {
  summary?: ReviewSummary;
  onReadAll?: () => void;
}

/**
 * Overall score plus a configurable set of category bars — hotel, airline,
 * rental and activity reviews all have different dimensions, so the category
 * list is data, never hardcoded. Every bar carries an explicit numeric label;
 * a progress bar with no text value is not an accessible data point.
 */
export const ReviewSummaryCard = ({ summary, onReadAll, style, containerStyle, testID }: ReviewSummaryCardProps) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();
  const id = testID ?? 'review-summary-card';

  if (!summary || summary.reviewCount === 0) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No reviews yet.
        </Text>
      </View>
    );
  }

  const lowSample = summary.reviewCount < 5;

  return (
    <View style={[containerStyle, style]} testID={id}>
      <View style={styles.headerRow}>
        <View style={styles.center}>
          <Text variant="displaySmall" style={styles.tabular}>
            {summary.overallScore.toFixed(1)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            out of {summary.maxScore}
          </Text>
        </View>
        <View style={[styles.flex, { marginLeft: theme.spacing.md }]}>
          <Text variant="titleSmall">Guest rating</Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Based on {summary.reviewCount} review{summary.reviewCount === 1 ? '' : 's'}
            {summary.verified ? ' · Verified stays' : ''}
          </Text>
          {summary.recentReviewDate ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Most recent: {summary.recentReviewDate}
            </Text>
          ) : null}
          {lowSample ? (
            <View style={styles.row}>
              <Icon source="information-outline" size={12} color={travel.colors.highDemand} />
              <Text variant="labelSmall" style={{ color: travel.colors.highDemand, marginLeft: 4 }}>
                Based on a small number of reviews
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {summary.categories.length > 0 ? (
        <View style={{ gap: 8, marginTop: theme.spacing.md }}>
          {summary.categories.map((category) => {
            const ratio = category.score / category.maxScore;
            return (
              <View key={category.id} style={{ gap: 2 }} testID={childTestID(id, `category-${category.id}`)}>
                <View style={styles.row}>
                  <Text variant="labelMedium" style={styles.flex}>
                    {category.label}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {category.score.toFixed(1)} out of {category.maxScore}
                  </Text>
                </View>
                <ProgressBar
                  progress={ratio}
                  color={travel.colors.bestValue}
                  style={{ height: 6, borderRadius: theme.radii.pill, backgroundColor: theme.colors.surfaceVariant }}
                  accessibilityLabel={`${category.label}: ${category.score.toFixed(1)} out of ${category.maxScore}`}
                />
              </View>
            );
          })}
        </View>
      ) : null}

      {summary.highlights && summary.highlights.length > 0 ? (
        <View style={{ gap: 6, marginTop: theme.spacing.md }}>
          {summary.highlights.map((highlight) => (
            <View key={highlight.id} style={styles.row}>
              <Icon
                source={highlight.sentiment === 'positive' ? 'thumb-up-outline' : 'thumb-down-outline'}
                size={13}
                color={highlight.sentiment === 'positive' ? travel.colors.freeCancellation : travel.colors.nonRefundable}
              />
              <Text variant="bodySmall" style={{ marginLeft: 6, flex: 1 }}>
                {highlight.text}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {onReadAll ? (
        <TouchableRipple onPress={onReadAll} accessibilityRole="button" accessibilityLabel="Read all reviews" style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }} testID={childTestID(id, 'read-all')}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Read all reviews
          </Text>
        </TouchableRipple>
      ) : null}

      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: theme.spacing.sm }}>
        Ratings are based on verified stays.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row' },
  center: { alignItems: 'center', minWidth: 64 },
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
