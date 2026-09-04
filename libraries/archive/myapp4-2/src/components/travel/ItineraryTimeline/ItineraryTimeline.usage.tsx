/**
 * USAGE — ItineraryTimeline
 *
 * Every timestamp carries an explicit "(IST)" label — a trip that stayed in
 * one timezone still states it, so the pattern doesn't silently disappear the
 * one time a trip actually crosses one.
 */
import React from 'react';
import { ScrollView } from 'react-native';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { ItineraryEvent } from '../types/domain';
import { ItineraryTimeline } from './ItineraryTimeline';
import sample from './ItineraryTimeline.sample.json';

const { events } = loadSample<{ events: ItineraryEvent[] }>(sample);

export const ItineraryTimelineUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();

  const wired = events.map((event) => ({
    ...event,
    actions: event.actions?.map((action) => ({ ...action, onPress: () => toast.show(action.label) })),
  }));

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      <ItineraryTimeline events={wired} />
    </ScrollView>
  );
};
