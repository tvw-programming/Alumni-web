/**
 * USAGE — LiveClassBanner
 *
 * The "Starting soon" banner counts down against a live clock; the "Live now"
 * banner has no countdown at all, because a timer that keeps running after the
 * class has begun tells the learner nothing useful.
 */
import React, { useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Text } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { LiveClass } from '../types/domain';
import { LiveClassBanner } from './LiveClassBanner';
import sample from './LiveClassBanner.sample.json';

const { classes } = loadSample<{ classes: Record<string, LiveClass> }>(sample);

export const LiveClassBannerUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const [reminders, setReminders] = useState<Record<string, boolean>>({});
  const [joiningId, setJoiningId] = useState<string>();
  const [joinErrorId, setJoinErrorId] = useState<string>();

  /** Re-base the countdown entries against the real clock so the demo ticks. */
  const entries = useMemo(() => {
    const now = Date.now();
    return Object.entries(classes).map(([key, item]) => {
      if (key === 'startingSoon') return [key, { ...item, startsAt: new Date(now + 12 * 60000).toISOString() }] as const;
      if (key === 'scheduled') return [key, { ...item, startsAt: new Date(now + 95 * 60000).toISOString() }] as const;
      return [key, item] as const;
    });
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: theme.spacing.md }}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
        The countdown announces at 30, 15, 10, 5 and 1 minutes rather than every second — a per-second live region is
        unusable with a screen reader. The literal start time is always present too.
      </Text>

      {entries.map(([key, item]) => (
        <LiveClassBanner
          key={key}
          liveClass={{ ...item, reminderEnabled: reminders[item.id] ?? item.reminderEnabled }}
          joining={joiningId === item.id}
          joinError={joinErrorId === item.id ? "We couldn't open the live class." : undefined}
          onJoin={async (live) => {
            setJoiningId(live.id);
            await new Promise((resolve) => setTimeout(resolve, 900));
            setJoiningId(undefined);
            if (live.id === 'lc-2') {
              setJoinErrorId(live.id);
              return;
            }
            toast.success('Joining the class');
          }}
          onSetReminder={(live, next) => {
            setReminders((prev) => ({ ...prev, [live.id]: next }));
            toast.show(next ? 'Reminder set' : 'Reminder removed');
          }}
          onWatchRecording={() => toast.show('Opening the recording')}
          onOpenInBrowser={() => toast.show('Opening in your browser')}
          testID={`live-${key}`}
        />
      ))}

      <View style={{ height: theme.spacing.xl }} />
    </ScrollView>
  );
};
