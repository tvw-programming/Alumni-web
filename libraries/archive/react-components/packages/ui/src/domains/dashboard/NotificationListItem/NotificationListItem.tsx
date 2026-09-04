import CircleIcon from '@mui/icons-material/Circle';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { describe, timeLabel, useOptimisticValue } from '../../../foundation';

export interface AppNotification {
  id: string;
  title: string;
  body?: string;
  category: string;
  at: string;
  read: boolean;
  actorName?: string;
  severity?: 'info' | 'warning' | 'critical';
}

export interface NotificationListItemProps {
  notification: AppNotification;
  onPress: () => void;
  onToggleRead?: (read: boolean) => Promise<void>;
}

/**
 * One notification.
 *
 * Read state is optimistic — the user's own flag, reversible, and a list that
 * waits for a round trip before dimming a row feels broken. React restores the
 * server's value if the request fails.
 *
 * Unread is stated in the label as well as drawn, because bold text and a
 * tinted background are the two usual signals and neither reaches a screen
 * reader.
 */
export const NotificationListItem = memo(function NotificationListItem({
  notification,
  onPress,
  onToggleRead,
}: NotificationListItemProps) {
  const [read, toggleRead, pending] = useOptimisticValue(notification.read, async (next) => {
    await onToggleRead?.(next);
  });

  return (
    <ListItemButton
      onClick={() => {
        if (!read) toggleRead(true);
        onPress();
      }}
      sx={{
        alignItems: 'flex-start',
        gap: 1.5,
        py: 1.25,
        bgcolor: read ? 'transparent' : 'action.hover',
        opacity: pending ? 0.7 : 1,
      }}
      aria-label={describe(
        notification.title,
        notification.actorName,
        notification.category,
        notification.severity && notification.severity !== 'info'
          ? notification.severity
          : undefined,
        timeLabel(notification.at),
        read ? 'read' : 'unread',
      )}
    >
      <Box sx={{ pt: 0.75, width: 10 }}>
        {!read ? <CircleIcon sx={{ fontSize: 8, color: 'primary.main' }} aria-hidden /> : null}
      </Box>

      <Avatar sx={{ width: 32, height: 32, fontSize: 14 }} alt="">
        {(notification.actorName ?? notification.title).charAt(0)}
      </Avatar>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={read ? 400 : 700} aria-hidden>
          {notification.title}
        </Typography>
        {notification.body ? (
          <Typography variant="caption" color="text.secondary" display="block" aria-hidden>
            {notification.body}
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Chip size="small" variant="outlined" label={notification.category} aria-hidden />
          {notification.severity && notification.severity !== 'info' ? (
            <Chip
              size="small"
              color={notification.severity === 'critical' ? 'error' : 'warning'}
              label={notification.severity === 'critical' ? 'Critical' : 'Warning'}
              aria-hidden
            />
          ) : null}
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {timeLabel(notification.at)}
          </Typography>
        </Stack>
      </Box>
    </ListItemButton>
  );
});
