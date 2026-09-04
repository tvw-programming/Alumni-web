import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Avatar, Icon, IconButton, Menu, Text, TouchableRipple } from 'react-native-paper';

import { useAppTheme } from '@/theme';
import { childTestID, initialsOf } from '@/utils';
import type { StyleEscapeHatches } from '@ui/primitives';

import { useWorkspaceTheme } from '../theme/enterpriseTokens';
import type { NotificationPriority, WorkspaceNotification } from '../types/domain';

const PRIORITY_META: Partial<Record<NotificationPriority, { label: string; colorKey: 'warning' | 'error' }>> = {
  important: { label: 'Important', colorKey: 'warning' },
  urgent: { label: 'Urgent', colorKey: 'error' },
};

export interface NotificationListItemProps extends StyleEscapeHatches {
  notification: WorkspaceNotification;
  onPress: (notification: WorkspaceNotification) => void;
  onMarkRead?: (notification: WorkspaceNotification) => void;
  onMarkUnread?: (notification: WorkspaceNotification) => void;
}

/**
 * Grouped notifications ("3 new comments on Project Atlas") are supported
 * via `groupCount`, since a notification service that dedupes noisy events
 * still needs to render one honest row rather than one per raw event.
 */
export const NotificationListItem = ({ notification, onPress, onMarkRead, onMarkUnread, style, containerStyle, testID }: NotificationListItemProps) => {
  const theme = useAppTheme();
  const enterprise = useWorkspaceTheme();
  const id = testID ?? `notification-${notification.id}`;
  const [menuVisible, setMenuVisible] = useState(false);
  const priorityMeta = notification.priority ? PRIORITY_META[notification.priority] : undefined;

  const a11yLabel = `${notification.read ? '' : 'Unread, '}${notification.title}${notification.body ? `, ${notification.body}` : ''}, ${new Date(notification.timestamp).toLocaleString()}`;

  return (
    <TouchableRipple onPress={() => onPress(notification)} accessibilityRole="button" accessibilityLabel={a11yLabel} style={[!notification.read ? { backgroundColor: enterprise.colors.selected } : undefined, containerStyle, style]} testID={id}>
      <View style={styles.row}>
        {notification.actor ? (
          notification.actor.avatar?.uri ? (
            <Avatar.Image size={32} source={{ uri: notification.actor.avatar.uri }} />
          ) : (
            <Avatar.Text size={32} label={initialsOf(notification.actor.name)} />
          )
        ) : (
          <View style={[styles.iconWrap, { backgroundColor: enterprise.colors.surfaceVariant }]}>
            <Icon source="bell-outline" size={14} color={enterprise.colors.onSurfaceVariant} />
          </View>
        )}

        <View style={[styles.flex, { marginLeft: 8 }]}>
          <View style={styles.row}>
            {!notification.read ? <View style={[styles.unreadDot, { backgroundColor: enterprise.colors.unread }]} accessibilityElementsHidden /> : null}
            <Text variant="bodyMedium" style={styles.flex} numberOfLines={2}>
              {notification.groupCount && notification.groupCount > 1 ? `${notification.title} (${notification.groupCount})` : notification.title}
            </Text>
            {priorityMeta ? (
              <Text variant="labelSmall" style={{ color: enterprise.colors[priorityMeta.colorKey] }}>
                {priorityMeta.label}
              </Text>
            ) : null}
          </View>
          {notification.body ? (
            <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }} numberOfLines={2}>
              {notification.body}
            </Text>
          ) : null}
          <Text variant="labelSmall" style={{ color: enterprise.colors.onSurfaceVariant }}>
            {new Date(notification.timestamp).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
          </Text>
        </View>

        {(onMarkRead || onMarkUnread) ? (
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={<IconButton icon="dots-vertical" size={16} onPress={() => setMenuVisible(true)} accessibilityLabel={`More options for ${notification.title}`} style={styles.noMargin} />}
          >
            {!notification.read && onMarkRead ? <Menu.Item onPress={() => { setMenuVisible(false); onMarkRead(notification); }} title="Mark as read" leadingIcon="check" testID={childTestID(id, 'mark-read')} /> : null}
            {notification.read && onMarkUnread ? <Menu.Item onPress={() => { setMenuVisible(false); onMarkUnread(notification); }} title="Mark as unread" leadingIcon="circle-outline" testID={childTestID(id, 'mark-unread')} /> : null}
          </Menu>
        ) : null}
      </View>
    </TouchableRipple>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', padding: 8 },
  iconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  unreadDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6, marginTop: 6 },
  noMargin: { margin: 0 },
});
