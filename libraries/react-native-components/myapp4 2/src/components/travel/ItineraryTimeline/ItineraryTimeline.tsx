import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useTravelTheme } from '../theme/travelTokens';
import type { ItineraryEvent, ItineraryEventType } from '../types/domain';

const TYPE_ICON: Record<ItineraryEventType, string> = {
  flight: 'airplane',
  hotel: 'bed-outline',
  activity: 'ticket-confirmation-outline',
  transfer: 'car-outline',
  car: 'car-key',
  meal: 'silverware-fork-knife',
};

export interface ItineraryTimelineProps extends StyleEscapeHatches {
  events: ItineraryEvent[];
  /** Traveler's current locale for day-header formatting. */
  locale?: string;
}

const dayKey = (iso: string) => iso.slice(0, 10);

/**
 * A chronological vertical timeline, grouped by day, where every event is
 * still understandable as a standalone item — title, time, location and
 * confirmation code never require scrolling to a neighbouring event to make
 * sense. Local time always carries an explicit timezone label so a trip that
 * crosses zones never reads as a scheduling error.
 */
export const ItineraryTimeline = ({ events, locale = 'en-IN', style, containerStyle, testID }: ItineraryTimelineProps) => {
  const theme = useAppTheme();
  const id = testID ?? 'itinerary-timeline';

  const days = useMemo(() => {
    const groups = new Map<string, ItineraryEvent[]>();
    for (const event of events) {
      const key = dayKey(event.startAt);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(event);
    }
    return Array.from(groups.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [events]);

  if (events.length === 0) {
    return (
      <View style={[containerStyle, style]} testID={id}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          No itinerary items yet.
        </Text>
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      {days.map(([key, dayEvents], dayIndex) => (
        <View key={key} style={{ marginBottom: theme.spacing.lg }}>
          <Text variant="titleSmall" accessibilityRole="header" style={{ marginBottom: theme.spacing.sm }}>
            Day {dayIndex + 1} · {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'short' }).format(new Date(key))}
          </Text>
          {dayEvents.map((event, index) => (
            <EventRow key={event.id} event={event} isLast={index === dayEvents.length - 1} locale={locale} testID={childTestID(id, event.id)} />
          ))}
        </View>
      ))}
    </View>
  );
};

const EventRow = ({ event, isLast, locale, testID }: { event: ItineraryEvent; isLast: boolean; locale: string; testID?: string }) => {
  const theme = useAppTheme();
  const travel = useTravelTheme();

  const time = new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startAt));
  const color =
    event.status === 'canceled'
      ? travel.colors.statusCanceled
      : event.status === 'changed'
        ? travel.colors.statusChanged
        : event.status === 'pending'
          ? travel.colors.statusPending
          : travel.colors.statusConfirmed;

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`${time}, ${event.title}, ${event.status}${event.location ? `, ${event.location}` : ''}`}
      testID={testID}
    >
      <View style={styles.railColumn}>
        <View style={[styles.node, { borderColor: color, backgroundColor: theme.colors.surface }]}>
          <Icon source={TYPE_ICON[event.type]} size={12} color={color} />
        </View>
        {!isLast ? <View style={[styles.line, { backgroundColor: theme.colors.outlineVariant }]} /> : null}
      </View>

      <View style={[styles.flex, { paddingBottom: isLast ? 0 : theme.spacing.md }]}>
        <View style={styles.headRow}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {time}
            {event.timezoneLabel ? ` (${event.timezoneLabel})` : ''}
          </Text>
          {event.status !== 'confirmed' ? (
            <Text variant="labelSmall" style={{ color, marginLeft: 8 }}>
              {event.status === 'canceled' ? 'Canceled' : event.status === 'changed' ? 'Changed' : 'Pending'}
            </Text>
          ) : null}
        </View>
        <Text variant="bodyLarge">{event.title}</Text>
        {event.location ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {event.location}
          </Text>
        ) : null}
        {event.confirmationCode ? (
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Confirmation: {event.confirmationCode}
          </Text>
        ) : null}
        {event.alert ? (
          <View style={[styles.alertRow, { backgroundColor: theme.colors.errorContainer, borderRadius: theme.radii.sm, padding: 6, marginTop: 4 }]} accessibilityLiveRegion="assertive">
            <Icon source="alert-circle-outline" size={13} color={theme.colors.onErrorContainer} />
            <Text variant="labelSmall" style={{ color: theme.colors.onErrorContainer, marginLeft: 4, flex: 1 }}>
              {event.alert}
            </Text>
          </View>
        ) : null}
        {event.actions && event.actions.length > 0 ? (
          <View style={[styles.row, { gap: 12, marginTop: 6 }]}>
            {event.actions.map((action) => (
              <TouchableRipple
                key={action.key}
                onPress={action.onPress}
                accessibilityRole="button"
                accessibilityLabel={action.label}
                testID={childTestID(testID, action.key)}
              >
                <Text variant="labelMedium" style={{ color: theme.colors.primary }}>
                  {action.label}
                </Text>
              </TouchableRipple>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  headRow: { flexDirection: 'row', alignItems: 'center' },
  railColumn: { alignItems: 'center', width: 24 },
  node: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  line: { width: 2, flex: 1, marginTop: 4, minHeight: 20 },
  flex: { flex: 1, marginLeft: 12 },
  alertRow: { flexDirection: 'row', alignItems: 'center' },
});
