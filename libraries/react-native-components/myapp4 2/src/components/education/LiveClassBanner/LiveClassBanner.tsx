import React, { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Image, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import Animated from 'react-native-reanimated';

import { AppButton } from '@ui/atoms/AppButton';
import { useMotion, type AnimatableProps } from '@/hooks';
import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useLearnTheme } from '../theme/educationTokens';
import type { LiveClass, LiveClassStatus } from '../types/domain';

const STATUS_META: Record<LiveClassStatus, { label: string; icon: string; colorKey: 'statusInProgress' | 'liveSoon' | 'liveNow' | 'statusCompleted' | 'statusCanceled' }> = {
  scheduled: { label: 'Scheduled', icon: 'calendar-clock', colorKey: 'statusInProgress' },
  startingSoon: { label: 'Starting soon', icon: 'timer-outline', colorKey: 'liveSoon' },
  live: { label: 'Live now', icon: 'record-circle', colorKey: 'liveNow' },
  ended: { label: 'Ended', icon: 'check-circle-outline', colorKey: 'statusCompleted' },
  canceled: { label: 'Canceled', icon: 'close-circle-outline', colorKey: 'statusCanceled' },
};

/** Announce at meaningful thresholds, not every tick. */
const ANNOUNCE_AT_MINUTES = [30, 15, 10, 5, 1];

export interface LiveClassBannerProps extends StyleEscapeHatches, Pick<AnimatableProps, 'animated'> {
  liveClass: LiveClass;
  locale?: string;
  onJoin?: (liveClass: LiveClass) => void;
  onSetReminder?: (liveClass: LiveClass, next: boolean) => void;
  onWatchRecording?: (liveClass: LiveClass) => void;
  onOpenInBrowser?: (liveClass: LiveClass) => void;
  joining?: boolean;
  joinError?: string;
}

/**
 * The live-session banner.
 *
 * Countdown behaviour is the delicate part: it only appears while it helps the
 * learner act, it is announced at meaningful thresholds rather than every second
 * (a per-second live region is unusable with a screen reader), and it disappears
 * the moment the class starts — replaced by "Live now" and a join action.
 * The literal start time is always present in text alongside it.
 */
export const LiveClassBanner = ({
  liveClass,
  locale = 'en-IN',
  onJoin,
  onSetReminder,
  onWatchRecording,
  onOpenInBrowser,
  joining = false,
  joinError,
  animated = true,
  style,
  containerStyle,
  testID,
}: LiveClassBannerProps) => {
  const theme = useAppTheme();
  const learn = useLearnTheme();
  const motion = useMotion({ animated });

  const id = testID ?? `live-${liveClass.id}`;
  const meta = STATUS_META[liveClass.status];
  const color = learn.colors[meta.colorKey];

  const [now, setNow] = useState(() => Date.now());
  const announced = React.useRef<number[]>([]);

  const startsAt = useMemo(() => new Date(liveClass.startsAt).getTime(), [liveClass.startsAt]);
  const minutesAway = Math.max(0, Math.round((startsAt - now) / 60000));

  const counting = liveClass.status === 'scheduled' || liveClass.status === 'startingSoon';

  useEffect(() => {
    if (!counting) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [counting]);

  useEffect(() => {
    if (!counting) return;
    if (ANNOUNCE_AT_MINUTES.includes(minutesAway) && !announced.current.includes(minutesAway)) {
      announced.current.push(minutesAway);
      AccessibilityInfo.announceForAccessibility(
        `${liveClass.title} starts in ${minutesAway} minute${minutesAway === 1 ? '' : 's'}`,
      );
    }
  }, [counting, liveClass.title, minutesAway]);

  const startTimeText = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, { weekday: 'short', hour: 'numeric', minute: '2-digit' }).format(
        new Date(liveClass.startsAt),
      ),
    [liveClass.startsAt, locale],
  );

  const countdownText = useMemo(() => {
    if (!counting) return null;
    if (minutesAway === 0) return 'Starting now';
    if (minutesAway < 60) return `Starts in ${minutesAway} minute${minutesAway === 1 ? '' : 's'}`;
    const hours = Math.round(minutesAway / 60);
    return `Starts in about ${hours} hour${hours === 1 ? '' : 's'}`;
  }, [counting, minutesAway]);

  const canJoin = liveClass.status === 'live' || liveClass.status === 'startingSoon';

  return (
    <Animated.View
      entering={motion.entering('fade')}
      style={[
        styles.root,
        {
          backgroundColor: theme.colors.surface,
          borderRadius: theme.radii.lg,
          borderWidth: StyleSheet.hairlineWidth * 2,
          borderColor: liveClass.status === 'live' ? learn.colors.liveNow : theme.colors.outlineVariant,
          overflow: 'hidden',
        },
        containerStyle,
        style,
      ]}
      testID={id}
    >
      {liveClass.coverImage?.uri ? (
        <Image
          source={{ uri: liveClass.coverImage.uri }}
          style={styles.cover}
          resizeMode="cover"
          accessibilityElementsHidden
        />
      ) : null}

      <View style={{ padding: theme.spacing.md, gap: theme.spacing.xs }}>
        <View style={[styles.row, { gap: 4 }]}>
          {/* Status word + icon; "Live now" is prominent but not alarming. */}
          <Icon source={meta.icon} size={14} color={color} />
          <Text variant="labelMedium" style={{ color }}>
            {meta.label}
          </Text>
          {liveClass.seatsRemaining != null ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginLeft: 6 }}>
              {liveClass.seatsRemaining === 0 ? 'Full' : `${liveClass.seatsRemaining} seats left`}
            </Text>
          ) : null}
        </View>

        <Text variant="titleMedium">{liveClass.title}</Text>

        {liveClass.instructor ? (
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            with {liveClass.instructor}
          </Text>
        ) : null}

        <View
          accessibilityLiveRegion={counting ? 'polite' : 'none'}
          accessibilityRole="text"
          // The literal time is always present, countdown or not.
          accessibilityLabel={`${countdownText ?? meta.label}. Starts at ${startTimeText}${
            liveClass.timezoneLabel ? ` ${liveClass.timezoneLabel}` : ''
          }`}
        >
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }}>
            {/* Countdown vanishes once the class begins. */}
            {countdownText ?? (liveClass.status === 'live' ? 'The class is in progress' : startTimeText)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {startTimeText}
            {liveClass.timezoneLabel ? ` · ${liveClass.timezoneLabel}` : ''}
          </Text>
        </View>

        {liveClass.statusNote ? (
          <Text variant="labelSmall" style={{ color: learn.colors.statusLate }}>
            {liveClass.statusNote}
          </Text>
        ) : null}

        {liveClass.accessRestrictedReason ? (
          <Text variant="labelSmall" style={{ color: learn.colors.statusLocked }}>
            {liveClass.accessRestrictedReason}
          </Text>
        ) : null}

        {joinError ? (
          <View style={{ gap: 2 }}>
            <Text variant="labelSmall" style={{ color: learn.colors.statusOverdue }}>
              {joinError}
            </Text>
            {onOpenInBrowser ? (
              <Text
                variant="labelSmall"
                onPress={() => onOpenInBrowser(liveClass)}
                accessibilityRole="button"
                style={{ color: theme.colors.primary }}
                testID={childTestID(id, 'browser')}
              >
                Open in browser instead
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.actions, { gap: theme.spacing.sm, marginTop: theme.spacing.xs }]}>
          {canJoin && onJoin && !liveClass.accessRestrictedReason ? (
            <AppButton
              variant="primary"
              containerStyle={styles.flex}
              loading={joining}
              debounceMs={800}
              onPress={() => onJoin(liveClass)}
              testID={childTestID(id, 'join')}
            >
              Join live class
            </AppButton>
          ) : null}

          {liveClass.status === 'ended' && liveClass.recordingAvailable && onWatchRecording ? (
            <AppButton
              variant="primary"
              containerStyle={styles.flex}
              icon="play-circle-outline"
              onPress={() => onWatchRecording(liveClass)}
              testID={childTestID(id, 'recording')}
            >
              Watch the recording
            </AppButton>
          ) : null}

          {liveClass.status === 'ended' && !liveClass.recordingAvailable ? (
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, flex: 1 }}>
              This class has ended. The recording will appear here when it is ready.
            </Text>
          ) : null}

          {/* Reminder is the secondary action while a class is still upcoming. */}
          {liveClass.status === 'scheduled' && onSetReminder ? (
            <AppButton
              variant={liveClass.reminderEnabled ? 'secondary' : 'ghost'}
              icon={liveClass.reminderEnabled ? 'bell-check' : 'bell-outline'}
              onPress={() => onSetReminder(liveClass, !liveClass.reminderEnabled)}
              testID={childTestID(id, 'reminder')}
            >
              {liveClass.reminderEnabled ? 'Reminder set' : 'Set reminder'}
            </AppButton>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { width: '100%' },
  cover: { width: '100%', height: 120 },
  row: { flexDirection: 'row', alignItems: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  flex: { flex: 1 },
});
