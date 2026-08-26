import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useGameTheme } from '../theme/gamingTokens';
import type { TimerStatus } from '../types/domain';

export interface CountdownTimerProps extends StyleEscapeHatches {
  endsAt: string;
  status: TimerStatus;
  /** Server timestamp used to compute drift-free elapsed/remaining time. */
  serverNow?: string;
  /** Seconds remaining at which to announce, e.g. [30, 10, 5]. */
  announceAt?: number[];
  onComplete?: () => void;
}

const DEFAULT_ANNOUNCE = [30, 10, 5];

/**
 * Remaining time is always computed from `endsAt` against a server-anchored
 * clock, never a client interval that could drift. Announcements fire only
 * at meaningful thresholds — not on every tick — so a screen reader is never
 * flooded with "29 seconds… 28 seconds…".
 */
export const CountdownTimer = ({ endsAt, status, serverNow, announceAt = DEFAULT_ANNOUNCE, onComplete, style, containerStyle, testID }: CountdownTimerProps) => {
  const theme = useAppTheme();
  const gaming = useGameTheme();
  const id = testID ?? 'countdown-timer';
  const offset = useRef(serverNow ? new Date(serverNow).getTime() - Date.now() : 0);
  const announced = useRef(new Set<number>());
  const completedFired = useRef(false);

  const computeRemaining = () => Math.max(0, Math.round((new Date(endsAt).getTime() - (Date.now() + offset.current)) / 1000));
  const [remaining, setRemaining] = useState(computeRemaining);

  useEffect(() => {
    if (status !== 'running' && status !== 'warning' && status !== 'critical') return;
    const timer = setInterval(() => {
      const next = computeRemaining();
      setRemaining(next);
      if (announceAt.includes(next) && !announced.current.has(next)) {
        announced.current.add(next);
        AccessibilityInfo.announceForAccessibility?.(`${next} seconds left`);
      }
      if (next === 0 && !completedFired.current) {
        completedFired.current = true;
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [endsAt, status]);

  const expired = status === 'expired' || remaining === 0;
  const color = expired ? gaming.colors.statusError : status === 'critical' ? gaming.colors.critical : status === 'warning' ? gaming.colors.warning : theme.colors.onSurface;

  const label = expired ? "Time's up" : `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`;

  return (
    <View
      style={[styles.row, containerStyle, style]}
      testID={id}
      accessibilityRole="text"
      accessibilityLabel={expired ? "Time's up" : status === 'paused' ? `Paused, ${remaining} seconds remaining` : `${remaining} seconds remaining`}
      accessibilityLiveRegion={status === 'critical' || expired ? 'assertive' : 'none'}
    >
      <Icon source={status === 'paused' ? 'pause-circle-outline' : expired ? 'timer-off-outline' : 'timer-outline'} size={16} color={color} />
      <Text variant="titleSmall" style={{ color, marginLeft: 4, fontVariant: ['tabular-nums'] }}>
        {status === 'paused' ? `Paused · ${label}` : label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
