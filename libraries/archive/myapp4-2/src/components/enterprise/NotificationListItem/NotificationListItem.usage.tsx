/**
 * USAGE — NotificationListItem
 *
 * Grouped notifications ("3 new comments on Project Atlas") render as one
 * honest row with a count, rather than one row per underlying event.
 */
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { Divider } from 'react-native-paper';

import { useToast } from '@ui/providers/ToastProvider';
import { useAppTheme } from '@/theme';

import { loadSample } from '../types/sample';
import type { WorkspaceNotification } from '../types/domain';
import { NotificationListItem } from './NotificationListItem';
import sample from './NotificationListItem.sample.json';

const { notifications: initial } = loadSample<{ notifications: WorkspaceNotification[] }>(sample);

export const NotificationListItemUsage = () => {
  const theme = useAppTheme();
  const toast = useToast();
  const [notifications, setNotifications] = useState(initial);

  return (
    <ScrollView contentContainerStyle={{ padding: theme.spacing.md }}>
      {notifications.map((notification, index) => (
        <React.Fragment key={notification.id}>
          <NotificationListItem
            notification={notification}
            onPress={(item) => toast.show(`Opening ${item.title}`)}
            onMarkRead={(item) => setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: true } : n)))}
            onMarkUnread={(item) => setNotifications((prev) => prev.map((n) => (n.id === item.id ? { ...n, read: false } : n)))}
          />
          {index < notifications.length - 1 ? <Divider /> : null}
        </React.Fragment>
      ))}
    </ScrollView>
  );
};
