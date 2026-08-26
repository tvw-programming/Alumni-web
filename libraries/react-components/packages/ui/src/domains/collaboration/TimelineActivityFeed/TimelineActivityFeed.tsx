import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { describe, pluralize, timeLabel, useOptimisticValue } from '../../../foundation';

export interface ActivityEntry {
  id: string;
  actor: string;
  action: string;
  target?: string;
  at: string;
  read: boolean;
  category?: string;
}

export interface TimelineActivityFeedProps {
  /** Grouped by date heading, in display order. */
  groups: { heading: string; entries: ActivityEntry[] }[];
  unreadCount: number;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, read: boolean) => Promise<void>;
  onMarkAllRead?: () => Promise<void>;
}

/**
 * Grouped activity, with per-entry and bulk read state.
 *
 * Read flags are optimistic — the user's own state, reversible, and a feed that
 * waits for a round trip before dimming a row feels broken. "Mark all as read"
 * is optimistic too, but the *count* it produces comes from the refetch: a
 * predicted "0 unread" that turns out to be 3 is worse than a half-second wait.
 *
 * Date headings are real list separators rather than styled rows, so a screen
 * reader announces the boundary between "Today" and "Yesterday".
 */
export function TimelineActivityFeed({
  groups,
  unreadCount,
  onOpen,
  onToggleRead,
  onMarkAllRead,
}: TimelineActivityFeedProps) {
  const [optimisticUnread, markAllRead, pending] = useOptimisticValue(unreadCount, async () => {
    await onMarkAllRead?.();
  });

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          Activity
        </Typography>
        {optimisticUnread > 0 ? (
          <Chip size="small" color="primary" label={`${String(optimisticUnread)} unread`} />
        ) : (
          <Typography variant="caption" color="text.secondary">
            All caught up
          </Typography>
        )}
        {onMarkAllRead && optimisticUnread > 0 ? (
          <Button
            size="small"
            sx={{ ml: 'auto' }}
            disabled={pending}
            onClick={() => {
              markAllRead(0);
            }}
          >
            Mark all as read
          </Button>
        ) : null}
      </Stack>

      {groups.map((group) => (
        <Box key={group.heading}>
          {/* A real separator, so the boundary is announced. */}
          <Divider textAlign="left" sx={{ px: 2 }}>
            <Typography variant="caption" color="text.secondary">
              {group.heading}
            </Typography>
          </Divider>

          <List
            disablePadding
            aria-label={`${group.heading}, ${pluralize(group.entries.length, 'item')}`}
          >
            {group.entries.map((entry) => (
              <ActivityRow
                key={entry.id}
                entry={entry}
                onOpen={onOpen}
                onToggleRead={onToggleRead}
              />
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );
}

function ActivityRow({
  entry,
  onOpen,
  onToggleRead,
}: {
  entry: ActivityEntry;
  onOpen: (id: string) => void;
  onToggleRead: (id: string, read: boolean) => Promise<void>;
}) {
  const [read, toggleRead] = useOptimisticValue(entry.read, async (next) => {
    await onToggleRead(entry.id, next);
  });

  return (
    <ListItemButton
      onClick={() => {
        if (!read) toggleRead(true);
        onOpen(entry.id);
      }}
      sx={{ gap: 1.5, bgcolor: read ? 'transparent' : 'action.hover' }}
      aria-label={describe(
        entry.actor,
        entry.action,
        entry.target,
        entry.category,
        timeLabel(entry.at),
        read ? 'read' : 'unread',
      )}
    >
      <Avatar sx={{ width: 28, height: 28, fontSize: 13 }} alt="">
        {entry.actor.charAt(0)}
      </Avatar>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={read ? 400 : 600} aria-hidden>
          {`${entry.actor} ${entry.action}${entry.target ? ` ${entry.target}` : ''}`}
        </Typography>
        <Typography variant="caption" color="text.secondary" aria-hidden>
          {timeLabel(entry.at).split(' (')[0]}
          {entry.category ? ` · ${entry.category}` : ''}
        </Typography>
      </Box>
    </ListItemButton>
  );
}
