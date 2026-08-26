/**
 * USAGE — PriceBreakdownSheet
 *
 * The platform-fee row is expandable in place — a real explanation reachable
 * with one tap, not squeezed into tiny footnote text.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PriceBreakdown } from '../types/domain';
import { PriceBreakdownSheet } from './PriceBreakdownSheet';
import sample from './PriceBreakdownSheet.sample.json';

const { breakdowns } = loadSample<{ breakdowns: Record<string, PriceBreakdown> }>(sample);
type Key = keyof typeof breakdowns;

export const PriceBreakdownSheetUsage = () => {
  const theme = useAppTheme();
  const [key, setKey] = useState<Key>('estimated');
  const [open, setOpen] = useState(false);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons
        value={key}
        onValueChange={(next) => setKey(next as Key)}
        density="small"
        buttons={[
          { value: 'estimated', label: 'Estimated' },
          { value: 'withDiscount', label: 'Discount' },
          { value: 'changed', label: 'Changed' },
          { value: 'calculating', label: 'Calculating' },
        ]}
      />

      <AppCard variant="outlined" title="Inline (checkout page)">
        <PriceBreakdownSheet breakdown={breakdowns[key]!} inline testID="price-inline" />
      </AppCard>

      <AppButton variant="secondary" fullWidth onPress={() => setOpen(true)}>
        Open as a bottom sheet
      </AppButton>

      <PriceBreakdownSheet
        breakdown={breakdowns[key]!}
        visible={open}
        onDismiss={() => setOpen(false)}
        title="Price details"
        testID="price-sheet"
      />
    </ScrollView>
  );
};
