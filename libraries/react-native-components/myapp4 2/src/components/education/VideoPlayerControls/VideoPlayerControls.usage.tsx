/**
 * USAGE — VideoPlayerControls + PlaybackSpeedMenu
 *
 * A running playback simulation. The speed choice persists across lessons, which
 * is the behaviour learners expect once they have found their pace.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SegmentedButtons, Text } from 'react-native-paper';

import { useSheet } from '@ui/providers/SheetProvider';
import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { PlaybackStatus } from '../types/domain';
import { VideoPlayerControls, formatTime } from './VideoPlayerControls';
import sample from './VideoPlayerControls.sample.json';

const data = loadSample<{
  scenarios: Record<string, PlaybackStatus>;
  lesson: { title: string; transcriptExcerpt: string };
}>(sample);

type ScenarioKey = 'playing' | 'pausedFast' | 'buffering' | 'error' | 'offline';

export const VideoPlayerControlsUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const sheet = useSheet();

  const [key, setKey] = useState<ScenarioKey>('playing');
  const [status, setStatus] = useState<PlaybackStatus>(data.scenarios.playing!);
  const [rememberSpeed, setRememberSpeed] = useState(true);

  useEffect(() => {
    // Speed carries over between lessons when the learner asked it to.
    setStatus((prev) => ({ ...data.scenarios[key]!, speed: rememberSpeed ? prev.speed : data.scenarios[key]!.speed }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  useEffect(() => {
    if (status.state !== 'playing') return;
    const id = setInterval(() => {
      setStatus((prev) => ({
        ...prev,
        position: Math.min(prev.duration, prev.position + prev.speed),
        buffered: Math.min(prev.duration, (prev.buffered ?? 0) + 1.2),
      }));
    }, 1000);
    return () => clearInterval(id);
  }, [status.state, status.speed]);

  const openTranscript = useCallback(() => {
    sheet.open(
      <View style={{ gap: theme.spacing.sm }}>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          At {formatTime(status.position)}
        </Text>
        <Text variant="bodyMedium" selectable>
          {data.lesson.transcriptExcerpt}
        </Text>
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          A real transcript is searchable and seeks the video when a line is tapped.
        </Text>
      </View>,
      { title: 'Transcript', variant: 'bottom', scrollable: true },
    );
  }, [sheet, status.position, theme]);

  return (
    <View style={styles.flex}>
      <View style={{ padding: theme.spacing.md, gap: theme.spacing.sm }}>
        <SegmentedButtons
          value={key}
          onValueChange={(next) => setKey(next as ScenarioKey)}
          density="small"
          buttons={[
            { value: 'playing', label: 'Playing' },
            { value: 'pausedFast', label: '1.5x' },
            { value: 'buffering', label: 'Buffer' },
            { value: 'error', label: 'Error' },
            { value: 'offline', label: 'Offline' },
          ]}
        />
        <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Transcript is a labelled control, not an overflow item. Every button has a text label beside its icon, and the
          speed sheet opens from the bottom so it cannot cover the captions.
        </Text>
      </View>

      {/* Stands in for the video surface. */}
      <View style={[styles.stage, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {data.lesson.title}
        </Text>
        {status.captionsEnabled && status.state === 'playing' ? (
          <View style={[styles.captions, { backgroundColor: theme.colors.backdrop, borderRadius: theme.radii.sm }]}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }}>
              …we get a single number that tells us how badly the line fits.
            </Text>
          </View>
        ) : null}
      </View>

      <VideoPlayerControls
        status={status}
        title={data.lesson.title}
        onPlayPause={() =>
          setStatus((prev) => ({ ...prev, state: prev.state === 'playing' ? 'paused' : 'playing' }))
        }
        onSeek={(seconds) => setStatus((prev) => ({ ...prev, position: seconds }))}
        onSkip={(delta) =>
          setStatus((prev) => ({ ...prev, position: Math.max(0, Math.min(prev.duration, prev.position + delta)) }))
        }
        onSpeedChange={(speed) => {
          setStatus((prev) => ({ ...prev, speed }));
          toast.show(`Playback speed ${speed === 1 ? 'normal' : `${speed}x`}`);
        }}
        onToggleCaptions={() => setStatus((prev) => ({ ...prev, captionsEnabled: !prev.captionsEnabled }))}
        onToggleFullscreen={() => setStatus((prev) => ({ ...prev, fullscreen: !prev.fullscreen }))}
        onQualityChange={(quality) => setStatus((prev) => ({ ...prev, quality }))}
        onOpenTranscript={openTranscript}
        onOpenNotes={() => toast.show(`Note at ${formatTime(status.position)}`)}
        onDownload={() => toast.success('Downloading for offline')}
        onRetry={() => setKey('playing')}
        rememberSpeed={rememberSpeed}
        onToggleRememberSpeed={setRememberSpeed}
        testID="player"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stage: { flex: 1, minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 12 },
  captions: { paddingHorizontal: 10, paddingVertical: 4, maxWidth: '85%' },
});
