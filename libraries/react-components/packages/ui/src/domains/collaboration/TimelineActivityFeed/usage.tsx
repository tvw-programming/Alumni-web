import { useQueryClient } from '@tanstack/react-query';

import sample from './sample.json';
import { TimelineActivityFeed } from './TimelineActivityFeed';

export function TimelineActivityFeedUsage() {
  const queryClient = useQueryClient();

  return (
    <TimelineActivityFeed
      groups={sample.groups}
      unreadCount={sample.unreadCount}
      onOpen={() => {
        /* navigate to the target */
      }}
      onToggleRead={async (id, read) => {
        const response = await fetch(`/api/activity/${id}/read`, {
          method: read ? 'PUT' : 'DELETE',
        });
        if (!response.ok) throw await response.json();
      }}
      onMarkAllRead={async () => {
        await fetch('/api/activity/read-all', { method: 'POST' });
        // The count comes back from the server: a predicted "0 unread" that
        // turns out to be 3 is worse than a half-second wait.
        await queryClient.invalidateQueries({ queryKey: ['activity'] });
      }}
    />
  );
}
