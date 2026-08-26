import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import ListItemButton from '@mui/material/ListItemButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { countLabel, describe, timeLabel } from '../../../foundation';

export interface Conversation {
  id: string;
  title: string;
  avatarUri?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  /** Draft text, shown in place of the last message. */
  draft?: string;
  muted?: boolean;
  presence?: 'online' | 'offline' | 'away';
}

export interface ConversationListItemProps {
  conversation: Conversation;
  selected?: boolean;
  onPress: () => void;
}

/**
 * One conversation in the list.
 *
 * Unread is a **count in the label**, not a bold font. Weight and a tinted
 * background are the two signals most commonly used for unread, and neither
 * reaches a screen reader.
 *
 * Presence is a word too: a green dot alone says nothing.
 */
export const ConversationListItem = memo(function ConversationListItem({
  conversation,
  selected = false,
  onPress,
}: ConversationListItemProps) {
  const unread = conversation.unreadCount > 0;

  return (
    <ListItemButton
      selected={selected}
      onClick={onPress}
      sx={{ gap: 1.5, alignItems: 'flex-start', py: 1.25 }}
      aria-label={describe(
        conversation.title,
        conversation.presence,
        conversation.draft !== undefined
          ? `draft: ${conversation.draft}`
          : conversation.lastMessage,
        timeLabel(conversation.lastMessageAt),
        unread ? `${countLabel(conversation.unreadCount)} unread` : 'no unread messages',
        conversation.muted === true ? 'muted' : undefined,
      )}
    >
      <Badge
        color="success"
        variant="dot"
        overlap="circular"
        invisible={conversation.presence !== 'online'}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Avatar src={conversation.avatarUri} alt="" sx={{ width: 40, height: 40 }}>
          {conversation.title.charAt(0)}
        </Avatar>
      </Badge>

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" justifyContent="space-between" spacing={1}>
          <Typography variant="body2" fontWeight={unread ? 700 : 500} noWrap aria-hidden>
            {conversation.title}
          </Typography>
          <Typography variant="caption" color="text.secondary" aria-hidden>
            {timeLabel(conversation.lastMessageAt).split(' (')[0]}
          </Typography>
        </Stack>

        <Stack direction="row" justifyContent="space-between" spacing={1} alignItems="center">
          <Typography
            variant="caption"
            color={conversation.draft !== undefined ? 'error.main' : 'text.secondary'}
            noWrap
            aria-hidden
          >
            {conversation.draft !== undefined
              ? `Draft: ${conversation.draft}`
              : conversation.lastMessage}
          </Typography>

          {unread ? (
            <Badge
              badgeContent={conversation.unreadCount}
              color="primary"
              aria-hidden
              sx={{ mr: 1.5 }}
            />
          ) : null}
        </Stack>
      </Box>
    </ListItemButton>
  );
});
