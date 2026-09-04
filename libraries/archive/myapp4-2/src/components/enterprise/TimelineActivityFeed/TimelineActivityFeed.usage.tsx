/**
 * USAGE — TimelineActivityFeed
 *
 * Unread events carry a dot, a background tint, and the literal word
 * "Unread" in the accessible label together — never just one signal alone.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ActivityEvent } from '../types/domain';
import { TimelineActivityFeed } from './TimelineActivityFeed';
import sample from './TimelineActivityFeed.sample.json';

const initial = loadSample<{ events: ActivityEvent[]; unreadCount: number }>(sample);

export const TimelineActivityFeedUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [events, setEvents] = useState(initial.events);

  const unreadCount = events.filter((e) => !e.read).length;

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <TimelineActivityFeed
        events={events}
        unreadCount={unreadCount}
        onEventPress={(item) => toast.show(`Opening ${item.title}`)}
        onMarkRead={(eventId) => setEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, read: true } : e)))}
        onMarkAllRead={() => {
          setEvents((prev) => prev.map((e) => ({ ...e, read: true })));
          toast.success('All caught up');
        }}
      />
    </ScrollView>
  );
};
