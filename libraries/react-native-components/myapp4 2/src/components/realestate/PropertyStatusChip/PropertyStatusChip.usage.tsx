/**
 * USAGE — PropertyStatusChip
 *
 * "Sold" and "Rented" use the same muted grey as everything else — never an
 * alarming red — while still being fully distinguishable via icon and text.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PropertyStatus } from '../types/domain';
import { PropertyStatusChip } from './PropertyStatusChip';
import sample from './PropertyStatusChip.sample.json';

const { statuses } = loadSample<{ statuses: { status: PropertyStatus; detail?: string }[] }>(sample);

export const PropertyStatusChipUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        {statuses.map((item) => (
          <PropertyStatusChip key={item.status} status={item.status} detail={item.detail} onPress={() => toast.show(`Status: ${item.status}`)} />
        ))}
      </View>
      <View style={{ gap: 4 }}>
        {statuses.map((item) => (
          <PropertyStatusChip key={`compact-${item.status}`} status={item.status} compact />
        ))}
      </View>
    </ScrollView>
  );
};
