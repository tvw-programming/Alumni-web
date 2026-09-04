/**
 * USAGE — MeditationPlayerCard
 *
 * "The Sleepy Meadow" is offline but still playable because it's downloaded
 * — the offline banner and "Playing downloaded audio" note appear together,
 * never a bare error for content that's actually available.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { MeditationPlaybackState, MeditationSession } from '../types/domain';
import { MeditationPlayerCard } from './MeditationPlayerCard';
import rawSample from './MeditationPlayerCard.sample.json';

const sample = loadSample<
  Record<'playing' | 'buffering' | 'offline' | 'error', { session: MeditationSession; playbackState: MeditationPlaybackState; positionSeconds: number; downloaded?: boolean; sleepTimerMinutes?: number }>
>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'playing', label: 'Playing' },
  { value: 'buffering', label: 'Buffering' },
  { value: 'offline', label: 'Offline' },
  { value: 'error', label: 'Error' },
];

export const MeditationPlayerCardUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('playing');
  const [favorited, setFavorited] = useState(false);
  const data = sample[scenario];

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <MeditationPlayerCard
        session={data.session}
        playbackState={data.playbackState}
        positionSeconds={data.positionSeconds}
        downloaded={data.downloaded}
        sleepTimerMinutes={data.sleepTimerMinutes}
        favorited={favorited}
        onPlayPause={() => toast.show(data.playbackState === 'playing' ? 'Paused' : 'Playing')}
        onOpen={() => toast.show(`Opening ${data.session.title}`)}
        onSetTimer={(minutes) => toast.success(`Sleep timer set to ${minutes} minutes`)}
        onDownload={() => toast.show(`Downloading ${data.session.title}…`)}
        onFavorite={() => setFavorited((v) => !v)}
      />
    </ScrollView>
  );
};
