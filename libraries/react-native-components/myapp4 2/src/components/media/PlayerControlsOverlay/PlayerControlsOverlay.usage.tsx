/**
 * USAGE — PlayerControlsOverlay
 *
 * The overlay only ever emits intent (`onPlayPause`, `onSeek`, …) — this
 * usage file stands in for the media engine, updating position on a fake
 * ticker to show the seek bar advancing.
 */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PlayerState } from '../types/domain';
import { PlayerControlsOverlay } from './PlayerControlsOverlay';
import rawSample from './PlayerControlsOverlay.sample.json';

const sample = loadSample<Record<'playing' | 'buffering' | 'error', PlayerState>>(rawSample);

const SCENARIOS: { value: keyof typeof sample; label: string }[] = [
  { value: 'playing', label: 'Playing' },
  { value: 'buffering', label: 'Buffering' },
  { value: 'error', label: 'Error' },
];

export const PlayerControlsOverlayUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [scenario, setScenario] = useState<keyof typeof sample>('playing');
  const [visible, setVisible] = useState(true);
  const [state, setState] = useState<PlayerState>(sample.playing);

  useEffect(() => {
    setState(sample[scenario]);
  }, [scenario]);

  useEffect(() => {
    if (!state.isPlaying || state.buffering) return;
    const timer = setInterval(() => {
      setState((prev) => ({ ...prev, positionMs: Math.min(prev.durationMs, prev.positionMs + 1000) }));
    }, 1000);
    return () => clearInterval(timer);
  }, [state.isPlaying, state.buffering]);

  return (
    <View style={{ padding: theme.spacing.md, gap: theme.spacing.md, backgroundColor: '#0B0B0F' }}>
      <SegmentedButtons value={scenario} onValueChange={(v) => setScenario(v as keyof typeof sample)} buttons={SCENARIOS} />
      <AppButton variant="secondary" onPress={() => setVisible((v) => !v)}>
        {visible ? 'Hide' : 'Show'} overlay
      </AppButton>

      <View style={{ height: 320, backgroundColor: '#000000', borderRadius: theme.radii.md, overflow: 'hidden' }}>
        <PlayerControlsOverlay
          visible={visible}
          state={state}
          onPlayPause={() => setState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }))}
          onSeek={(positionMs) => setState((prev) => ({ ...prev, positionMs }))}
          onSkipBack={() => setState((prev) => ({ ...prev, positionMs: Math.max(0, prev.positionMs - 10000) }))}
          onSkipForward={() => setState((prev) => ({ ...prev, positionMs: Math.min(prev.durationMs, prev.positionMs + 10000) }))}
          onQualityChange={(q) => setState((prev) => ({ ...prev, selectedQuality: q }))}
          onSubtitleChange={(s) => setState((prev) => ({ ...prev, selectedSubtitle: s }))}
          onAudioChange={(a) => setState((prev) => ({ ...prev, selectedAudio: a }))}
          onSpeedChange={(s) => setState((prev) => ({ ...prev, selectedSpeed: s }))}
          onCast={() => toast.show('Connecting to cast device…')}
          onFullscreen={() => toast.show('Entering fullscreen')}
          onNextEpisode={() => toast.show('Playing next episode')}
        />
      </View>
    </View>
  );
};
