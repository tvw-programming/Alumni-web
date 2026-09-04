import React, { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Icon, IconButton, Menu, ProgressBar, Text } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { AppCard } from '@ui/molecules/AppCard';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWellnessTheme } from '../theme/fitnessTokens';
import type { MeditationPlaybackState, MeditationSession, MeditationType } from '../types/domain';

const TYPE_LABEL: Record<MeditationType, string> = {
  guided: 'Guided meditation',
  sleepStory: 'Sleep Story',
  soundscape: 'Soundscape',
  music: 'Music',
  breathing: 'Breathing exercise',
};

const TIMER_OPTIONS = [5, 10, 15, 30, 45, 60];

export interface MeditationPlayerCardProps extends StyleEscapeHatches {
  session: MeditationSession;
  playbackState: MeditationPlaybackState;
  positionSeconds: number;
  downloaded?: boolean;
  sleepTimerMinutes?: number;
  onPlayPause: () => void;
  onOpen?: () => void;
  onSetTimer?: (minutes: number) => void;
  onDownload?: () => void;
  onFavorite?: () => void;
  favorited?: boolean;
}

const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/**
 * A calm, low-density player — the sleep timer is a menu of real durations,
 * never an assumption every session type supports the same autoplay or
 * timer behaviour. Motion stays optional throughout; nothing here requires
 * animation to remain usable.
 */
export const MeditationPlayerCard = ({
  session,
  playbackState,
  positionSeconds,
  downloaded = false,
  sleepTimerMinutes,
  onPlayPause,
  onOpen,
  onSetTimer,
  onDownload,
  onFavorite,
  favorited = false,
  style,
  containerStyle,
  testID,
}: MeditationPlayerCardProps) => {
  const theme = useAppTheme();
  const wellness = useWellnessTheme();
  const id = testID ?? `meditation-${session.id}`;
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);
  const buffering = playbackState === 'buffering';
  const error = playbackState === 'error';
  const offline = playbackState === 'offline';
  const progress = session.durationSeconds > 0 ? positionSeconds / session.durationSeconds : 0;

  return (
    <AppCard variant="outlined" containerStyle={containerStyle} style={style} testID={id}>
      <View style={{ gap: theme.spacing.sm }}>
        <View style={styles.row}>
          <View style={[styles.artwork, { backgroundColor: wellness.colors.surfaceVariant }]}>
            {session.image?.uri ? (
              <Image source={{ uri: session.image.uri }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityElementsHidden />
            ) : (
              <Icon source="weather-night" size={20} color={wellness.colors.onSurfaceVariant} />
            )}
          </View>

          <View style={[styles.flex, { marginLeft: theme.spacing.sm }]}>
            <Text variant="titleSmall" numberOfLines={1} onPress={onOpen}>
              {session.title}
            </Text>
            {session.subtitle ? (
              <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }} numberOfLines={1}>
                {session.subtitle}
              </Text>
            ) : null}
            <Text variant="labelSmall" style={{ color: wellness.colors.onSurfaceVariant }}>
              {TYPE_LABEL[session.type]} · {formatTime(session.durationSeconds)}
            </Text>
          </View>

          {onFavorite ? (
            <IconButton icon={favorited ? 'heart' : 'heart-outline'} size={18} onPress={onFavorite} accessibilityLabel={favorited ? `Remove ${session.title} from favorites` : `Add ${session.title} to favorites`} style={styles.noMargin} testID={childTestID(id, 'favorite')} />
          ) : null}
        </View>

        {error ? (
          <View style={styles.row}>
            <Icon source="alert-circle-outline" size={14} color={wellness.colors.error} />
            <Text variant="labelSmall" style={{ color: wellness.colors.error, marginLeft: 4 }}>
              We couldn't play this session. Try again.
            </Text>
          </View>
        ) : offline ? (
          <View style={styles.row}>
            <Icon source="wifi-off" size={14} color={wellness.colors.warning} />
            <Text variant="labelSmall" style={{ color: wellness.colors.warning, marginLeft: 4 }}>
              No connection{downloaded ? ' · Playing downloaded audio' : ''}
            </Text>
          </View>
        ) : null}

        <ProgressBar
          progress={progress}
          color={wellness.colors.primary}
          style={{ height: 4, borderRadius: theme.radii.pill, backgroundColor: wellness.colors.surfaceVariant }}
          accessibilityLabel={`${formatTime(positionSeconds)} of ${formatTime(session.durationSeconds)}`}
        />

        <View style={styles.controlsRow}>
          <View style={styles.row}>
            {onDownload ? (
              <IconButton
                icon={downloaded ? 'check-circle' : 'download-outline'}
                size={18}
                onPress={downloaded ? undefined : onDownload}
                disabled={downloaded}
                accessibilityLabel={downloaded ? 'Downloaded for offline listening' : 'Download for offline'}
                style={styles.noMargin}
                testID={childTestID(id, 'download')}
              />
            ) : null}
            {onSetTimer ? (
              <Menu
                visible={timerMenuOpen}
                onDismiss={() => setTimerMenuOpen(false)}
                anchor={<IconButton icon="timer-outline" size={18} onPress={() => setTimerMenuOpen(true)} accessibilityLabel={sleepTimerMinutes ? `Sleep timer: ${sleepTimerMinutes} minutes` : 'Sleep timer'} style={styles.noMargin} testID={childTestID(id, 'timer')} />}
              >
                {TIMER_OPTIONS.map((minutes) => (
                  <Menu.Item
                    key={minutes}
                    title={`${minutes} minutes`}
                    trailingIcon={sleepTimerMinutes === minutes ? 'check' : undefined}
                    onPress={() => {
                      setTimerMenuOpen(false);
                      onSetTimer(minutes);
                    }}
                  />
                ))}
              </Menu>
            ) : null}
          </View>

          {buffering ? (
            <ActivityIndicator size={32} accessibilityLabel="Loading audio" testID={childTestID(id, 'buffering')} />
          ) : (
            <AppButton variant="primary" size="sm" onPress={onPlayPause} disabled={error} testID={childTestID(id, 'play-pause')}>
              {playbackState === 'playing' ? 'Pause' : positionSeconds > 0 ? 'Continue' : 'Begin'}
            </AppButton>
          )}
        </View>
      </View>
    </AppCard>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  flex: { flex: 1 },
  artwork: { width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  controlsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  noMargin: { margin: 0 },
});
