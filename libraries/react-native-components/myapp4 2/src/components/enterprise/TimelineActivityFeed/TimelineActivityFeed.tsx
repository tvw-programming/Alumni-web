import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, Text, TouchableRipple } from 'react-native-paper';

import { AppButton } from '@ui/atoms/AppButton';
import { SkeletonLoader } from '@ui/atoms/Skeleton';
import { StateView } from '@ui/molecules/StateView';
import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { ActivityEvent } from '../types/domain';

const TYPE_ICON: Record<string, string> = {
  assignment: 'account-arrow-right-outline',
  mention: 'at',
  comment: 'comment-outline',
  dueDate: 'calendar-clock-outline',
  attachment: 'paperclip',
  completion: 'check-circle-outline',
  default: 'bell-outline',
};

export interface TimelineActivityFeedProps extends StyleEscapeHatches {
  events: ActivityEvent[];
  loading?: boolean;
  unreadCount?: number;
  onEventPress?: (event: ActivityEvent) => void;
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
}

const dayKey = (iso: string) => iso.slice(0, 10);

/**
 * Unread is never a dot or bold weight alone — every row's accessible label
 * states "unread" explicitly, and each event renders actor, action, object,
 * and timestamp in that order so the sentence reads the same way for
 * everyone.
 */
export const TimelineActivityFeed = ({ events, loading = false, unreadCount, onEventPress, onMarkRead, onMarkAllRead, style, containerStyle, testID }: TimelineActivityFeedProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? 'timeline-activity-feed';

  const groups = useMemo(() => {
    const map = new Map<string, ActivityEvent[]>();
    for (const event of events) {
      const key = dayKey(event.timestamp);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    }
    return Array.from(map.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  if (loading) {
    return (
      <View style={[containerStyle, style]} testID={childTestID(id, 'loading')}>
        <SkeletonLoader shape="text" lines={6} />
      </View>
    );
  }

  return (
    <View style={[containerStyle, style]} testID={id}>
      {(unreadCount ?? 0) > 0 && onMarkAllRead ? (
        <View style={styles.headerRow}>
          <Text variant="labelMedium" style={{ color: enterprise.colors.unread, flex: 1 }} accessibilityLiveRegion="polite">
            {unreadCount} unread
          </Text>
          <AppButton variant="ghost" size="sm" onPress={onMarkAllRead} testID={childTestID(id, 'mark-all-read')}>
            Mark all as read
          </AppButton>
        </View>
      ) : null}

      {events.length === 0 ? (
        <StateView preset="empty" compact title="No new activity" />
      ) : (
        groups.map(([day, dayEvents]) => (
          <View key={day} style={{ marginBottom: theme.spacing.md }}>
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant, marginBottom: 4 }}>
              {new Date(day).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
            </Text>
            {dayEvents.map((event) => (
              <EventRow key={event.id} event={event} onPress={onEventPress} onMarkRead={onMarkRead} testID={childTestID(id, event.id)} />
            ))}
          </View>
        ))
      )}
    </View>
  );
};

const EventRow = ({ event, onPress, onMarkRead, testID }: { event: ActivityEvent; onPress?: (e: ActivityEvent) => void; onMarkRead?: (id: string) => void; testID?: string }) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();

  const a11yLabel = `${event.read ? '' : 'Unread, '}${event.actor ? `${event.actor.name} ` : ''}${event.title}${event.entity ? `, ${event.entity.label}` : ''}, ${new Date(event.timestamp).toLocaleString()}`;

  return (
    <TouchableRipple onPress={onPress ? () => onPress(event) : undefined} disabled={!onPress} accessibilityRole={onPress ? 'button' : 'text'} accessibilityLabel={a11yLabel} testID={testID}>
      <View style={[styles.eventRow, !event.read ? { backgroundColor: enterprise.colors.selected, borderRadius: theme.radii.sm } : undefined]}>
        {event.actor ? (
          event.actor.avatar?.uri ? (
            <Avatar.Image size={28} source={{ uri: event.actor.avatar.uri }} />
          ) : (
            <Avatar.Text size={28} label={initialsOf(event.actor.name)} />
          )
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: enterprise.colors.surfaceVariant }]}>
            <Icon source={TYPE_ICON[event.type] ?? TYPE_ICON.default} size={14} color={enterprise.colors.onSurfaceVariant} />
          </View>
        )}

        <View style={[styles.flex, { marginLeft: 8 }]}>
          <View style={styles.row}>
            {!event.read ? <View style={[styles.unreadDot, { backgroundColor: enterprise.colors.unread }]} accessibilityElementsHidden /> : null}
            <Text variant="bodySmall" style={styles.flex} numberOfLines={2}>
              {event.title}
            </Text>
          </View>
          {event.description ? (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }} numberOfLines={2}>
              {event.description}
            </Text>
          ) : null}
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            {new Date(event.timestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
            {event.entity ? ` · ${event.entity.label}` : ''}
          </Text>
        </View>

        {!event.read && onMarkRead ? (
          <Text variant="labelSmall" onPress={() => onMarkRead(event.id)} accessibilityRole="button" accessibilityLabel="Mark as read" style={{ color: theme.colors.primary }}>
            Mark read
          </Text>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eventRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 6 },
  iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  unreadDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
});
