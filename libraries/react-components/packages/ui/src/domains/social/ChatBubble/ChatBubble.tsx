import DoneIcon from '@mui/icons-material/Done';
import DoneAllIcon from '@mui/icons-material/DoneAll';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ScheduleIcon from '@mui/icons-material/Schedule';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { memo } from 'react';

import { clockLabel, describe, type MessageId } from '../../../foundation';

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageReference {
  id: MessageId;
  author: string;
  preview: string;
}

export interface ChatMessage {
  id: MessageId;
  sender: { id: string; name: string };
  body?: string;
  sentAt: string;
  direction: 'sent' | 'received';
  status: MessageStatus;
  replyTo?: MessageReference;
}

export interface ChatBubbleProps {
  message: ChatMessage;
  showSender?: boolean;
  onRetry?: () => Promise<void>;
}

const STATUS_WORD: Record<MessageStatus, string> = {
  sending: 'sending',
  sent: 'sent',
  delivered: 'delivered',
  read: 'read',
  failed: 'not sent',
};

/**
 * One message.
 *
 * The tick marks are the classic colour-only signal — one tick, two ticks, two
 * blue ticks — and they are meaningless to a screen reader. The status is
 * therefore a word inside the bubble's label, and the icon is `aria-hidden`.
 *
 * A failed message keeps its text and offers a retry. Dropping the text of a
 * message that failed to send is the fastest way to lose something a user typed
 * once and will not type again.
 */
export const ChatBubble = memo(function ChatBubble({
  message,
  showSender = false,
  onRetry,
}: ChatBubbleProps) {
  const outgoing = message.direction === 'sent';
  const failed = message.status === 'failed';

  const StatusIcon =
    message.status === 'sending'
      ? ScheduleIcon
      : message.status === 'failed'
        ? ErrorOutlineIcon
        : message.status === 'read' || message.status === 'delivered'
          ? DoneAllIcon
          : DoneIcon;

  return (
    <Stack
      direction="row"
      justifyContent={outgoing ? 'flex-end' : 'flex-start'}
      sx={{ px: 1, py: 0.25 }}
    >
      <Box sx={{ maxWidth: '78%' }}>
        {showSender && !outgoing ? (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }} aria-hidden>
            {message.sender.name}
          </Typography>
        ) : null}

        <Paper
          variant="outlined"
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: 2,
            borderColor: failed ? 'error.main' : 'divider',
            bgcolor: outgoing ? 'primary.main' : 'background.paper',
            color: outgoing ? 'primary.contrastText' : 'text.primary',
            opacity: message.status === 'sending' ? 0.75 : 1,
          }}
          // Sender, body, time and status as one phrase.
          aria-label={describe(
            outgoing ? 'You' : message.sender.name,
            message.replyTo ? `replying to ${message.replyTo.author}` : undefined,
            message.body,
            clockLabel(message.sentAt),
            STATUS_WORD[message.status],
          )}
        >
          {message.replyTo ? (
            <Box
              aria-hidden
              sx={{
                borderLeft: 3,
                borderColor: outgoing ? 'primary.contrastText' : 'primary.main',
                pl: 1,
                mb: 0.5,
                opacity: 0.8,
              }}
            >
              <Typography variant="caption" fontWeight={700} display="block">
                {message.replyTo.author}
              </Typography>
              <Typography variant="caption" noWrap display="block">
                {message.replyTo.preview}
              </Typography>
            </Box>
          ) : null}

          {message.body ? (
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }} aria-hidden>
              {message.body}
            </Typography>
          ) : null}

          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            justifyContent="flex-end"
            sx={{ mt: 0.25 }}
          >
            <Typography variant="caption" sx={{ opacity: 0.8 }} aria-hidden>
              {clockLabel(message.sentAt)}
            </Typography>
            {outgoing ? (
              <StatusIcon
                aria-hidden
                sx={{ fontSize: 14, color: message.status === 'read' ? 'info.light' : 'inherit' }}
              />
            ) : null}
          </Stack>
        </Paper>

        {failed && onRetry ? (
          <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.25 }}>
            <Button
              size="small"
              color="error"
              onClick={() => {
                void onRetry();
              }}
            >
              Not sent — retry
            </Button>
          </Stack>
        ) : null}
      </Box>
    </Stack>
  );
});
