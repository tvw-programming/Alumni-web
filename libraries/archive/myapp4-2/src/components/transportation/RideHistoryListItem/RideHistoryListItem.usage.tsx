/**
 * USAGE — RideHistoryListItem
 *
 * Status is announced via icon + word in the accessible label, so a screen
 * reader never depends on a coloured route line to tell "canceled" from
 * "completed".
 */
import React from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { RideHistoryItem } from '../types/domain';
import { RideHistoryListItem } from './RideHistoryListItem';
import sample from './RideHistoryListItem.sample.json';

const { items } = loadSample<{ items: RideHistoryItem[] }>(sample);

export const RideHistoryListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ paddingVertical: theme.spacing.md }}>
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          <RideHistoryListItem
            item={item}
            containerStyle={{ paddingHorizontal: theme.spacing.md }}
            onPress={(ride) => toast.show(`Opening trip ${ride.id}`)}
            onReceipt={(ride) => toast.show(`Opening receipt for ${ride.id}`)}
            onSupport={(ride) => toast.show(`Opening support for ${ride.id}`)}
            onTip={(ride) => toast.show(`Opening tip selector for ${ride.id}`)}
          />
          {index < items.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
