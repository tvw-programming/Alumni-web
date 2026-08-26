import List from '@mui/material/List';

import { NotificationListItem, type AppNotification } from './NotificationListItem';
import sample from './sample.json';

export function NotificationListItemUsage() {
  const notification = sample.notification as AppNotification;

  return (
    <List disablePadding>
      <NotificationListItem
        notification={notification}
        onPress={() => {
          /* open the invoice */
        }}
        // Optimistic: the row dims immediately, and React restores the unread
        // state by itself if this rejects.
        onToggleRead={async (read) => {
          const response = await fetch(`/api/notifications/${notification.id}/read`, {
            method: read ? 'PUT' : 'DELETE',
          });
          if (!response.ok) throw await response.json();
        }}
      />
    </List>
  );
}
