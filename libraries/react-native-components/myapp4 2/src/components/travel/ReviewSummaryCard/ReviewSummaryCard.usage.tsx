/**
 * USAGE — ReviewSummaryCard
 *
 * The "low sample" property shows only 3 reviews — the small-sample notice
 * appears instead of letting a thin average look as confident as 1,842
 * reviews would.
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ReviewSummary } from '../types/domain';
import { ReviewSummaryCard } from './ReviewSummaryCard';
import rawSample from './ReviewSummaryCard.sample.json';

const sample = loadSample<Record<'wellReviewed' | 'lowSample' | 'none', ReviewSummary>>(rawSample);

export const ReviewSummaryCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.lg }}>
      <Text variant="titleSmall">Well-reviewed property</Text>
      <ReviewSummaryCard summary={sample.wellReviewed} onReadAll={() => toast.show('Opening all reviews')} />

      <Text variant="titleSmall">Low sample size</Text>
      <ReviewSummaryCard summary={sample.lowSample} onReadAll={() => toast.show('Opening all reviews')} />

      <Text variant="titleSmall">No reviews</Text>
      <ReviewSummaryCard summary={sample.none} />
    </ScrollView>
  );
};
