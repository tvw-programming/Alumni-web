/**
 * USAGE — SeasonSelector
 *
 * The unreleased season stays visible and disabled rather than hidden — a
 * viewer can see it's coming instead of wondering if the show only has 6
 * seasons.
 */
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { Season } from '../types/domain';
import { SeasonSelector } from './SeasonSelector';
import sample from './SeasonSelector.sample.json';

const { twoSeasons, manySeasons, oneSeason } = loadSample<{ twoSeasons: Season[]; manySeasons: Season[]; oneSeason: Season[] }>(sample);

export const SeasonSelectorUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [segmented, setSegmented] = useState('s1');
  const [menu, setMenu] = useState('s1');
  const [chips, setChips] = useState('s1');

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, backgroundColor: '#0B0B0F', gap: theme.spacing.lg }}>
      <View>
        <Text variant="labelSmall" style={{ color: '#B9BAC2', marginBottom: 8 }}>
          Segmented (2 seasons)
        </Text>
        <SeasonSelector seasons={twoSeasons} selectedSeasonId={segmented} variant="segmented" onChange={(id) => { setSegmented(id); toast.show(`Loading ${twoSeasons.find((s) => s.id === id)?.label}`); }} />
      </View>

      <View>
        <Text variant="labelSmall" style={{ color: '#B9BAC2', marginBottom: 8 }}>
          Menu (compact mobile)
        </Text>
        <SeasonSelector seasons={manySeasons} selectedSeasonId={menu} variant="menu" onChange={setMenu} />
      </View>

      <View>
        <Text variant="labelSmall" style={{ color: '#B9BAC2', marginBottom: 8 }}>
          Scrollable tabs (many seasons)
        </Text>
        <SeasonSelector seasons={manySeasons} selectedSeasonId={chips} variant="segmented" onChange={setChips} />
      </View>

      <View>
        <Text variant="labelSmall" style={{ color: '#B9BAC2', marginBottom: 8 }}>
          Single-season series
        </Text>
        <SeasonSelector seasons={oneSeason} onChange={() => {}} />
      </View>
    </ScrollView>
  );
};
