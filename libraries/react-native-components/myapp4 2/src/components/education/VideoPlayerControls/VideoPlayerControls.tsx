import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, Menu, Text, TouchableRipple } from 'react-native-paper';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';
import type { AnimatableProps } from '@/hooks';

import { useLearnTheme } from '../theme/educationTokens';
import type { PlaybackStatus, VideoQuality } from '../types/domain';
import { PlaybackSpeedMenu, formatSpeed } from './PlaybackSpeedMenu';

const QUALITY_LABEL: Record<VideoQuality, string> = {
  auto: 'Auto',
  '1080p': '1080p',
  '720p': '720p',
  '480p': '480p',
  '360p': '360p',
  audioOnly: 'Audio only',
};

export const formatTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    : `${m}:${String(s).padStart(2, '0')}`;
};

/** Spoken form — "2:05" reads as a ratio to some screen readers. */
export const spokenTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${m} minute${m === 1 ? '' : 's'} ${s} second${s === 1 ? '' : 's'}`;
};

export interface VideoPlayerControlsProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  status: PlaybackStatus;
  title?: string;
  onPlayPause: () => void;
  onSeek: (seconds: number) => void;
  onSkip: (deltaSeconds: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleCaptions: () => void;
  onToggleFullscreen?: () => void;
  onQualityChange?: (quality: VideoQuality) => void;
  onOpenTranscript?: () => void;
  onOpenNotes?: () => void;
  onDownload?: () => void;
  onRetry?: () => void;
  qualities?: VideoQuality[];
  rememberSpeed?: boolean;
  onToggleRememberSpeed?: (next: boolean) => void;
  skipSeconds?: number;
}

/**
 * Video transport controls.
 *
 * Media state lives in the player service; this bar renders `status` and emits
 * intent. Two education-specific choices: the transcript is a first-class
 * control rather than buried in an overflow menu (it is the primary access route
 * for many learners), and controls never auto-hide — a control that vanishes
 * mid-keyboard-interaction is a WCAG failure and an everyday annoyance.
 */
export const VideoPlayerControls = ({
  status,
  title,
  onPlayPause,
  onSeek,
  onSkip,
  onSpeedChange,
  onToggleCaptions,
  onToggleFullscreen,
  onQualityChange,
  onOpenTranscript,
  onOpenNotes,
  onDownload,
  onRetry,
  qualities = ['auto', '1080p', '720p', '480p', '360p'],
  rememberSpeed,
  onToggleRememberSpeed,
  skipSeconds = 10,
  animated = true,
  style,
  containerStyle,
  testID,
}: VideoPlayerControlsProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();

  const [speedOpen, setSpeedOpen] = useState(false);
  const [qualityOpen, setQualityOpen] = useState(false);
  const [trackWidth, setTrackWidth] = useState(0);

  const playing = status.state === 'playing';
  const buffering = status.state === 'buffering';
  const errored = status.state === 'error';

  const fraction = status.duration > 0 ? status.position / status.duration : 0;
  const bufferedFraction = status.duration > 0 ? (status.buffered ?? 0) / status.duration : 0;

  const scrubX = useSharedValue(0);
  const scrubbing = useSharedValue(false);

  const commitSeek = useCallback(
    (ratio: number) => {
      onSeek(Math.max(0, Math.min(1, ratio)) * status.duration);
    },
    [onSeek, status.duration],
  );

  /** Drag-to-scrub. Tapping the track also seeks, for coarse pointers. */
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!errored && status.duration > 0)
        .onBegin((event) => {
          scrubbing.value = true;
          scrubX.value = event.x;
        })
        .onUpdate((event) => {
          scrubX.value = Math.max(0, Math.min(trackWidth, event.x));
        })
        .onEnd(() => {
          scrubbing.value = false;
          if (trackWidth > 0) runOnJS(commitSeek)(scrubX.value / trackWidth);
        }),
    [commitSeek, errored, scrubX, scrubbing, status.duration, trackWidth],
  );

  const thumbStyle = useAnimatedStyle(() => ({
    left: scrubbing.value ? scrubX.value : fraction * trackWidth,
  }));

  if (errored) {
    return (
      <View style={[{ backgroundColor: theme.colors.surface }, containerStyle, style]} testID={childTestID(testID, 'error')}>
        <StateView
          preset={status.offline ? 'offline' : 'error'}
          compact
          title={status.offline ? 'This video is unavailable offline' : 'We’re having trouble loading this video'}
          description={
            status.errorMessage ??
            (status.offline
              ? 'Download this lesson while online to watch it later.'
              : 'Your connection may be unstable. Try a lower video quality.')
          }
          primaryAction={onRetry ? { label: 'Try again', onPress: onRetry } : undefined}
          secondaryAction={
            onQualityChange ? { label: 'Lower quality', onPress: () => onQualityChange('360p') } : undefined
          }
        />
      </View>
    );
  }

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.surface, padding: theme.spacing.sm, gap: theme.spacing.xs }, containerStyle, style]}
      testID={testID}
    >
      {title ? (
        <Text variant="labelMedium" numberOfLines={1} style={{ paddingHorizontal: theme.spacing.xs }}>
          {title}
        </Text>
      ) : null}

      {/* Seek bar */}
      <GestureDetector gesture={pan}>
        <View
          style={styles.trackWrap}
          onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Video position"
          accessibilityValue={{
            min: 0,
            max: Math.floor(status.duration),
            now: Math.floor(status.position),
            text: `${spokenTime(status.position)} of ${spokenTime(status.duration)}`,
          }}
          accessibilityActions={[
            { name: 'increment', label: `Skip forward ${skipSeconds} seconds` },
            { name: 'decrement', label: `Skip back ${skipSeconds} seconds` },
          ]}
          onAccessibilityAction={(event) =>
            onSkip(event.nativeEvent.actionName === 'increment' ? skipSeconds : -skipSeconds)
          }
          testID={childTestID(testID, 'seek')}
        >
          <View style={[styles.track, { backgroundColor: learn.colors.progressTrack, borderRadius: theme.radii.pill }]}>
            <View
              style={[styles.buffered, { width: `${bufferedFraction * 100}%`, backgroundColor: theme.colors.outlineVariant }]}
            />
            <View
              style={[styles.played, { width: `${fraction * 100}%`, backgroundColor: learn.colors.progressValue }]}
            />
          </View>
          <Animated.View
            style={[styles.thumb, thumbStyle, { backgroundColor: learn.colors.progressValue }]}
            pointerEvents="none"
          />
        </View>
      </GestureDetector>

      <View style={[styles.row, { paddingHorizontal: theme.spacing.xs }]}>
        <Text variant="labelSmall" style={[styles.tabular, { color: theme.colors.onSurfaceVariant }]}>
          {formatTime(status.position)}
        </Text>
        <View style={styles.flex} />
        <Text variant="labelSmall" style={[styles.tabular, { color: theme.colors.onSurfaceVariant }]}>
          {formatTime(status.duration)}
        </Text>
      </View>

      {/* Primary transport */}
      <View style={[styles.controls, { gap: theme.spacing.sm }]}>
        <ControlButton
          icon="rewind-10"
          label={`Skip back ${skipSeconds} seconds`}
          onPress={() => onSkip(-skipSeconds)}
          testID={childTestID(testID, 'back')}
        />

        <ControlButton
          icon={buffering ? undefined : playing ? 'pause' : 'play'}
          busy={buffering}
          // The label states the action and flips with state.
          label={buffering ? 'Buffering' : playing ? 'Pause' : 'Play'}
          primary
          onPress={onPlayPause}
          testID={childTestID(testID, 'play')}
        />

        <ControlButton
          icon="fast-forward-10"
          label={`Skip forward ${skipSeconds} seconds`}
          onPress={() => onSkip(skipSeconds)}
          testID={childTestID(testID, 'forward')}
        />
      </View>

      {/* Secondary controls — each one labelled, none icon-only. */}
      <View style={[styles.secondary, { gap: theme.spacing.xs }]}>
        <PillButton
          icon={status.captionsEnabled ? 'closed-caption' : 'closed-caption-outline'}
          label={status.captionsEnabled ? 'Captions on' : 'Captions off'}
          accessibilityLabel={status.captionsEnabled ? 'Turn captions off' : 'Turn captions on'}
          active={status.captionsEnabled}
          onPress={onToggleCaptions}
          testID={childTestID(testID, 'captions')}
        />

        <PillButton
          icon="speedometer"
          label={formatSpeed(status.speed)}
          accessibilityLabel={`Playback speed, currently ${formatSpeed(status.speed)}`}
          onPress={() => setSpeedOpen(true)}
          testID={childTestID(testID, 'speed')}
        />

        {/* Transcript is a first-class control, never hidden in overflow. */}
        {onOpenTranscript ? (
          <PillButton
            icon="script-text-outline"
            label="Transcript"
            accessibilityLabel="Open transcript"
            onPress={onOpenTranscript}
            testID={childTestID(testID, 'transcript')}
          />
        ) : null}

        {onOpenNotes ? (
          <PillButton
            icon="note-plus-outline"
            label="Note"
            accessibilityLabel="Take a note at the current timestamp"
            onPress={onOpenNotes}
            testID={childTestID(testID, 'notes')}
          />
        ) : null}

        {onQualityChange ? (
          <Menu
            visible={qualityOpen}
            onDismiss={() => setQualityOpen(false)}
            anchor={
              <PillButton
                icon="quality-high"
                label={QUALITY_LABEL[status.quality]}
                accessibilityLabel={`Video quality, currently ${QUALITY_LABEL[status.quality]}`}
                onPress={() => setQualityOpen(true)}
                testID={childTestID(testID, 'quality')}
              />
            }
          >
            {qualities.map((quality) => (
              <Menu.Item
                key={quality}
                title={QUALITY_LABEL[quality]}
                leadingIcon={quality === status.quality ? 'check' : undefined}
                onPress={() => {
                  onQualityChange(quality);
                  setQualityOpen(false);
                }}
                testID={childTestID(testID, `quality-${quality}`)}
              />
            ))}
          </Menu>
        ) : null}

        {onDownload ? (
          <PillButton
            icon="download-outline"
            label="Offline"
            accessibilityLabel="Download this lesson to watch offline"
            onPress={onDownload}
            testID={childTestID(testID, 'download')}
          />
        ) : null}

        {onToggleFullscreen ? (
          <PillButton
            icon={status.fullscreen ? 'fullscreen-exit' : 'fullscreen'}
            label={status.fullscreen ? 'Exit' : 'Full screen'}
            accessibilityLabel={status.fullscreen ? 'Exit full screen' : 'Enter full screen'}
            onPress={onToggleFullscreen}
            testID={childTestID(testID, 'fullscreen')}
          />
        ) : null}
      </View>

      {buffering ? (
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}
          accessibilityLiveRegion="polite"
        >
          Trying to reconnect…
        </Text>
      ) : null}

      <PlaybackSpeedMenu
        visible={speedOpen}
        onDismiss={() => setSpeedOpen(false)}
        speed={status.speed}
        onChange={onSpeedChange}
        rememberChoice={rememberSpeed}
        onToggleRemember={onToggleRememberSpeed}
        testID={childTestID(testID, 'speed-menu')}
      />
    </View>
  );
};

const ControlButton = ({
  icon,
  label,
  onPress,
  primary = false,
  busy = false,
  testID,
}: {
  icon?: string;
  label: string;
  onPress: () => void;
  primary?: boolean;
  busy?: boolean;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const size = primary ? learn.layout.playerControlSize + 8 : learn.layout.playerControlSize;

  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[
        styles.control,
        {
          width: size,
          height: size,
          borderRadius: theme.radii.pill,
          backgroundColor: primary ? learn.colors.progressValue : theme.colors.surfaceVariant,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
    >
      <View style={styles.center}>
        {busy ? (
          <ActivityIndicator size={18} color={primary ? '#FFFFFF' : theme.colors.onSurface} />
        ) : (
          <Icon source={icon ?? 'play'} size={primary ? 26 : 22} color={primary ? '#FFFFFF' : theme.colors.onSurface} />
        )}
      </View>
    </TouchableRipple>
  );
};

const PillButton = ({
  icon,
  label,
  accessibilityLabel,
  onPress,
  active = false,
  testID,
}: {
  icon: string;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  active?: boolean;
  testID?: string;
}) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();

  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[
        styles.pill,
        {
          borderRadius: theme.radii.pill,
          backgroundColor: active ? learn.colors.surfaceSelected : theme.colors.surfaceVariant,
          paddingHorizontal: theme.spacing.sm,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      testID={testID}
    >
      <View style={[styles.row, { gap: 4, paddingVertical: 6 }]}>
        <Icon source={icon} size={16} color={active ? learn.colors.onSurfaceSelected : theme.colors.onSurface} />
        {/* Text label alongside every icon. */}
        <Text variant="labelSmall" style={{ color: active ? learn.colors.onSurfaceSelected : theme.colors.onSurface }}>
          {label}
        </Text>
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  center: { alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%' },
  trackWrap: { height: 24, justifyContent: 'center', paddingHorizontal: 4 },
  track: { height: 4, width: '100%', overflow: 'hidden' },
  buffered: { position: 'absolute', height: '100%', left: 0 },
  played: { position: 'absolute', height: '100%', left: 0 },
  thumb: { position: 'absolute', width: 14, height: 14, borderRadius: 7, marginLeft: -3 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondary: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center' },
  control: { overflow: 'hidden' },
  pill: { overflow: 'hidden' },
  flex: { flex: 1 },
  tabular: { fontVariant: ['tabular-nums'] },
});
