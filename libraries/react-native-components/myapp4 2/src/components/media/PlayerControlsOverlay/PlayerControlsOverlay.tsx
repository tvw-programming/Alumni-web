import React, { useState } from 'react';
import { Pressable, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from 'react-native';
import { ActivityIndicator, IconButton, List, Menu, ProgressBar, Text } from 'react-native-paper';

import { AppSheet } from '@ui/organisms/AppSheet';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useStreamingTheme } from '../theme/mediaTokens';
import type { PlayerState } from '../types/domain';

export interface PlayerControlsOverlayProps extends StyleEscapeHatches {
  visible: boolean;
  state: PlayerState;
  onPlayPause: () => void;
  onSeek: (positionMs: number) => void;
  onSkipBack?: () => void;
  onSkipForward?: () => void;
  onQualityChange?: (quality: string) => void;
  onSubtitleChange?: (subtitle: string) => void;
  onAudioChange?: (audio: string) => void;
  onSpeedChange?: (speed: number) => void;
  onCast?: () => void;
  onFullscreen?: () => void;
  onNextEpisode?: () => void;
}

const formatTime = (ms: number) => {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

/**
 * The overlay renders state and emits intent — it never owns buffering, DRM,
 * or stream selection itself, so it works the same whether the media engine
 * underneath is ExoPlayer, AVPlayer, or a third party. Captions, audio
 * description and cast are always labelled controls here, never bare icons
 * with no accessible name.
 */
export const PlayerControlsOverlay = ({
  visible,
  state,
  onPlayPause,
  onSeek,
  onSkipBack,
  onSkipForward,
  onQualityChange,
  onSubtitleChange,
  onAudioChange,
  onSpeedChange,
  onCast,
  onFullscreen,
  onNextEpisode,
  style,
  containerStyle,
  testID,
}: PlayerControlsOverlayProps) => {
  const theme = useAppTheme();
  const media = useStreamingTheme();
  const id = testID ?? 'player-controls-overlay';
  const [qualityMenuOpen, setQualityMenuOpen] = useState(false);
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false);
  const [audioSheetOpen, setAudioSheetOpen] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(0);

  if (!visible) return null;

  const progress = state.durationMs > 0 ? state.positionMs / state.durationMs : 0;

  const handleSeekPress = (event: GestureResponderEvent) => {
    if (!seekBarWidth || state.durationMs <= 0) return;
    const ratio = Math.min(1, Math.max(0, event.nativeEvent.locationX / seekBarWidth));
    onSeek(Math.round(ratio * state.durationMs));
  };

  const handleSeekBarLayout = (event: LayoutChangeEvent) => setSeekBarWidth(event.nativeEvent.layout.width);

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: media.colors.overlay }, containerStyle, style]} testID={id}>
      {state.errorMessage ? (
        <View style={styles.errorBanner} accessibilityLiveRegion="assertive">
          <Text variant="labelMedium" style={{ color: '#FFFFFF' }}>
            {state.errorMessage}
          </Text>
        </View>
      ) : null}

      <View style={styles.centerRow}>
        {onSkipBack ? (
          <IconButton icon="rewind-10" size={32} iconColor="#FFFFFF" onPress={onSkipBack} accessibilityLabel="Seek back 10 seconds" testID={childTestID(id, 'skip-back')} />
        ) : null}

        {state.buffering ? (
          <ActivityIndicator size={48} color="#FFFFFF" accessibilityLabel="Buffering" testID={childTestID(id, 'buffering')} />
        ) : (
          <IconButton
            icon={state.isPlaying ? 'pause' : 'play'}
            size={48}
            iconColor="#FFFFFF"
            onPress={onPlayPause}
            accessibilityLabel={state.isPlaying ? 'Pause' : 'Play'}
            testID={childTestID(id, 'play-pause')}
          />
        )}

        {onSkipForward ? (
          <IconButton icon="fast-forward-10" size={32} iconColor="#FFFFFF" onPress={onSkipForward} accessibilityLabel="Seek forward 10 seconds" testID={childTestID(id, 'skip-forward')} />
        ) : null}
      </View>

      {state.nextEpisodeLabel && onNextEpisode ? (
        <View style={styles.nextEpisodeRow}>
          <IconButton icon="skip-next" size={22} iconColor="#FFFFFF" onPress={onNextEpisode} accessibilityLabel={state.nextEpisodeLabel} testID={childTestID(id, 'next-episode')} />
          <Text variant="labelSmall" style={{ color: '#FFFFFF' }}>
            {state.nextEpisodeLabel}
          </Text>
        </View>
      ) : null}

      <View style={styles.bottomBar}>
        <View style={styles.seekRow}>
          <Text variant="labelSmall" style={styles.timeText}>
            {formatTime(state.positionMs)}
          </Text>
          <Pressable
            style={styles.flex}
            onLayout={handleSeekBarLayout}
            onPress={handleSeekPress}
            accessibilityRole="adjustable"
            accessibilityLabel="Seek"
            accessibilityValue={{ min: 0, max: state.durationMs, now: state.positionMs, text: `${formatTime(state.positionMs)} of ${formatTime(state.durationMs)}` }}
            hitSlop={{ top: 12, bottom: 12 }}
            testID={childTestID(id, 'seek-bar')}
          >
            <ProgressBar
              progress={progress}
              color={media.colors.progressValue}
              style={{ height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)' }}
            />
          </Pressable>
          <Text variant="labelSmall" style={styles.timeText}>
            {formatTime(state.durationMs)}
          </Text>
        </View>

        <View style={styles.actionRow}>
          {onQualityChange && state.qualityOptions ? (
            <Menu
              visible={qualityMenuOpen}
              onDismiss={() => setQualityMenuOpen(false)}
              anchor={<IconButton icon="quality-high" size={20} iconColor="#FFFFFF" onPress={() => setQualityMenuOpen(true)} accessibilityLabel={`Quality: ${state.selectedQuality ?? 'Auto'}`} testID={childTestID(id, 'quality')} />}
            >
              {state.qualityOptions.map((q) => (
                <Menu.Item
                  key={q}
                  title={q}
                  trailingIcon={q === state.selectedQuality ? 'check' : undefined}
                  onPress={() => {
                    setQualityMenuOpen(false);
                    onQualityChange(q);
                  }}
                />
              ))}
            </Menu>
          ) : null}

          {onSpeedChange && state.speedOptions ? (
            <Menu
              visible={speedMenuOpen}
              onDismiss={() => setSpeedMenuOpen(false)}
              anchor={<IconButton icon="speedometer" size={20} iconColor="#FFFFFF" onPress={() => setSpeedMenuOpen(true)} accessibilityLabel={`Playback speed: ${state.selectedSpeed ?? 1}x`} testID={childTestID(id, 'speed')} />}
            >
              {state.speedOptions.map((s) => (
                <Menu.Item
                  key={s}
                  title={`${s}×`}
                  trailingIcon={s === state.selectedSpeed ? 'check' : undefined}
                  onPress={() => {
                    setSpeedMenuOpen(false);
                    onSpeedChange(s);
                  }}
                />
              ))}
            </Menu>
          ) : null}

          {(onSubtitleChange || onAudioChange) ? (
            <IconButton icon="closed-caption-outline" size={20} iconColor="#FFFFFF" onPress={() => setAudioSheetOpen(true)} accessibilityLabel="Audio and subtitles" testID={childTestID(id, 'audio-subtitles')} />
          ) : null}

          {onCast ? (
            <IconButton
              icon={state.castState === 'connected' ? 'cast-connected' : 'cast'}
              size={20}
              iconColor="#FFFFFF"
              onPress={onCast}
              accessibilityLabel={state.castState === 'connected' ? 'Cast connected. Tap to manage.' : state.castState === 'connecting' ? 'Connecting to cast device' : 'Cast'}
              testID={childTestID(id, 'cast')}
            />
          ) : null}

          {onFullscreen ? <IconButton icon="fullscreen" size={20} iconColor="#FFFFFF" onPress={onFullscreen} accessibilityLabel="Fullscreen" testID={childTestID(id, 'fullscreen')} /> : null}
        </View>
      </View>

      <AppSheet visible={audioSheetOpen} onDismiss={() => setAudioSheetOpen(false)} variant="bottom" title="Audio and subtitles" testID={childTestID(id, 'audio-sheet')}>
        <View style={{ paddingBottom: theme.spacing.md }}>
          {state.audioOptions && state.audioOptions.length > 0 ? (
            <View>
              <List.Subheader>Audio</List.Subheader>
              {state.audioOptions.map((audio) => (
                <List.Item
                  key={audio}
                  title={audio}
                  left={(props) => (state.selectedAudio === audio ? <List.Icon {...props} icon="check" /> : null)}
                  onPress={() => onAudioChange?.(audio)}
                  testID={childTestID(id, `audio-${audio}`)}
                />
              ))}
            </View>
          ) : null}
          {state.subtitleOptions && state.subtitleOptions.length > 0 ? (
            <View>
              <List.Subheader>Subtitles</List.Subheader>
              {state.subtitleOptions.map((sub) => (
                <List.Item
                  key={sub}
                  title={sub}
                  left={(props) => (state.selectedSubtitle === sub ? <List.Icon {...props} icon="check" /> : null)}
                  onPress={() => onSubtitleChange?.(sub)}
                  testID={childTestID(id, `subtitle-${sub}`)}
                />
              ))}
            </View>
          ) : null}
        </View>
      </AppSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  errorBanner: { position: 'absolute', top: 16, left: 16, right: 16, alignItems: 'center' },
  centerRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 },
  nextEpisodeRow: { position: 'absolute', top: 16, right: 16, flexDirection: 'row', alignItems: 'center' },
  bottomBar: { paddingHorizontal: 16, paddingBottom: 16, gap: 6 },
  seekRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  timeText: { color: '#FFFFFF', fontVariant: ['tabular-nums'] },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end' },
});
