/**
 * USAGE — MiniPlayerBar
 *
 * The bar is docked above a simulated tab bar with safe-area padding — it
 * only ever emits `onOpen`, `onPlayPause`, `onNext`, `onDismiss`; the full
 * player screen (not shown here) owns queue, speed, and captions.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MiniPlayerItem, MiniPlayerStatus } from '../types/domain';
import { MiniPlayerBar } from './MiniPlayerBar';
import rawSample from './MiniPlayerBar.sample.json';

const sample = loadSample<Record<'playing' | 'buffering' | 'offline', { item: MiniPlayerItem; isPlaying: boolean; progress: number; buffering?: boolean; status?: MiniPlayerStatus }>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'playing', label: 'Playing' },
  { value: 'buffering', label: 'Buffering' },
  { value: 'offline', label: 'Offline' },
];

export const MiniPlayerBarUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('playing');
  const [playing, setPlaying] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const data = sample[scenario];

  return (
    <View style={{ flex: 1, backgroundColor: '#0B0B0F' }}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
        <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
        {dismissed ? (
          <Text variant="bodyMedium" onPress={() => setDismissed(false)} style={{ color: theme.colors.primary }}>
            Mini player dismissed — tap to bring it back
          </Text>
        ) : (
          <Text variant="bodyMedium" style={{ color: '#B9BAC2' }}>
            Simulated screen content above a docked mini player.
          </Text>
        )}
      </View>

      {!dismissed ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
          <MiniPlayerBar
            item={data.item}
            isPlaying={playing}
            progress={data.progress}
            buffering={data.buffering}
            status={data.status}
            onPlayPause={() => setPlaying((p) => !p)}
            onOpen={() => toast.show(`Opening full player for ${data.item.title}`)}
            onNext={() => toast.show('Playing next item')}
            onDismiss={() => setDismissed(true)}
          />
        </View>
      ) : null}
    </View>
  );
};
