/**
 * USAGE — LivesEnergyBar / CurrencyPill (ResourcePill)
 *
 * The exhausted-lives pill counts down from a server timestamp, not a local
 * timer, so backgrounding the app or changing the device clock never fakes a
 * faster refill.
 */
import React from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Resource } from '../types/domain';
import { ResourcePill } from './ResourcePill';
import rawSample from './ResourcePill.sample.json';

const sample = loadSample<Record<'lives' | 'livesExhausted' | 'energy' | 'coins' | 'gems' | 'tokens', Resource>>(rawSample);

export const ResourcePillUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm }}>
        <ResourcePill resource={sample.lives} onPress={() => toast.show('5 of 5 lives')} />
        <ResourcePill resource={sample.energy} onPress={() => toast.show('60 of 100 energy')} />
        <ResourcePill resource={sample.coins} onPress={() => toast.show('Opening wallet')} />
        <ResourcePill resource={sample.gems} onPress={() => toast.show('Syncing gem balance…')} />
        <ResourcePill resource={sample.tokens} onPress={() => toast.show('Balance unavailable')} />
      </View>

      <Text variant="titleSmall">Exhausted, with refill</Text>
      <ResourcePill resource={sample.livesExhausted} onRefill={() => toast.show('Opening lives shop')} />
    </ScrollView>
  );
};
