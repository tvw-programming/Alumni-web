/**
 * USAGE — HeroBanner
 *
 * The component renders exactly one item and never times its own rotation —
 * a real carousel controller would own that, this file just switches which
 * item is shown.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { HeroContent, HeroPrimaryAction } from '../types/domain';
import { HeroBanner } from './HeroBanner';
import rawSample from './HeroBanner.sample.json';

const sample = loadSample<Record<'play' | 'resume' | 'subscribe', { content: HeroContent; primaryAction: HeroPrimaryAction; errorMessage?: string }>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'play', label: 'Play' },
  { value: 'resume', label: 'Resume' },
  { value: 'subscribe', label: 'Locked' },
];

export const HeroBannerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('play');
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const data = sample[scenario];

  return (
    <ScrollView contentContainerStyle={{ backgroundColor: '#0B0B0F' }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} style={{ margin: theme.spacing.md }} />
      <HeroBanner
        content={data.content}
        primaryAction={data.primaryAction}
        errorMessage={data.errorMessage}
        watchlistState={watchlist.includes(data.content.id) ? 'saved' : 'notSaved'}
        onPrimaryAction={(item) => toast.show(`${data.primaryAction === 'subscribe' ? 'Opening plans for' : 'Playing'} ${item.title}`)}
        onWatchlistToggle={(item) => setWatchlist((prev) => (prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id]))}
      />
    </ScrollView>
  );
};
