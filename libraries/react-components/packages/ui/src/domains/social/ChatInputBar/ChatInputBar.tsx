import AttachFileIcon from '@mui/icons-material/AttachFile';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { useAction } from '../../../foundation';

import type { ChatMessage } from '../ChatBubble/ChatBubble';

export interface AttachmentDraft {
  id: string;
  name: string;
  /** 0–100 while uploading, undefined once complete. */
  progress?: number;
  error?: string;
}

export interface ChatInputBarProps {
  value: string;
  replyTo?: ChatMessage;
  attachments: AttachmentDraft[];
  disabled?: boolean;
  disabledReason?: string;
  onChange: (value: string) => void;
  onSend: () => Promise<void>;
  onAttach: () => void;
  onRemoveAttachment?: (id: string) => void;
  onCancelReply?: () => void;
}

/**
 * The composer.
 *
 * The draft is **controlled by the parent**, because it has to outlive this
 * component: navigating away and back, or a re-render from an incoming message,
 * must not eat what someone typed. Persist it per conversation.
 *
 * Sending is an Action. The message is cleared by the parent only after the
 * Action resolves — clearing on click loses the text when the send fails, which
 * is exactly when the user most wants it back.
 *
 * Enter sends, Shift+Enter adds a newline, and neither is negotiable in a chat
 * input.
 */
export function ChatInputBar({
  value,
  replyTo,
  attachments,
  disabled = false,
  disabledReason,
  onChange,
  onSend,
  onAttach,
  onRemoveAttachment,
  onCancelReply,
}: ChatInputBarProps) {
  const [result, send, pending] = useAction<void, 'sent'>(async () => {
    await onSend();
    return 'sent';
  });

  const uploading = attachments.some((attachment) => attachment.progress !== undefined);
  const canSend =
    !disabled && !pending && !uploading && (value.trim() !== '' || attachments.length > 0);

  return (
    <Paper variant="outlined" sx={{ p: 1 }}>
      {replyTo ? (
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ mb: 1, pl: 1, borderLeft: 3, borderColor: 'primary.main' }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="caption" fontWeight={700} display="block">
              {`Replying to ${replyTo.sender.name}`}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {replyTo.body}
            </Typography>
          </Box>
          <IconButton size="small" aria-label="Cancel reply" onClick={onCancelReply}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Stack>
      ) : null}

      {attachments.length > 0 ? (
        <Stack direction="row" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
          {attachments.map((attachment) => (
            <Box key={attachment.id}>
              <Chip
                size="small"
                label={attachment.name}
                color={attachment.error ? 'error' : 'default'}
                onDelete={
                  onRemoveAttachment
                    ? () => {
                        onRemoveAttachment(attachment.id);
                      }
                    : undefined
                }
              />
              {attachment.progress !== undefined ? (
                <LinearProgress
                  variant="determinate"
                  value={attachment.progress}
                  aria-label={`Uploading ${attachment.name}, ${String(attachment.progress)} percent`}
                  sx={{ mt: 0.25, height: 3, borderRadius: 2 }}
                />
              ) : null}
              {attachment.error ? (
                <Typography variant="caption" color="error.main">
                  {attachment.error}
                </Typography>
              ) : null}
            </Box>
          ))}
        </Stack>
      ) : null}

      <Stack direction="row" spacing={1} alignItems="flex-end">
        <IconButton aria-label="Attach a file" disabled={disabled} onClick={onAttach}>
          <AttachFileIcon />
        </IconButton>

        <TextField
          multiline
          maxRows={6}
          fullWidth
          size="small"
          placeholder={disabledReason ?? 'Write a message'}
          value={value}
          disabled={disabled}
          onChange={(event) => {
            onChange(event.target.value);
          }}
          onKeyDown={(event) => {
            // Enter sends, Shift+Enter is a newline. Not negotiable in a chat.
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              if (canSend) send();
            }
          }}
        />

        <IconButton
          color="primary"
          aria-label="Send message"
          disabled={!canSend}
          onClick={() => {
            send();
          }}
        >
          {pending ? <CircularProgress size={20} /> : <SendIcon />}
        </IconButton>
      </Stack>

      <Box aria-live="polite" sx={{ minHeight: result.status === 'idle' ? 0 : 18, px: 1 }}>
        {result.status === 'error' ? (
          <Typography variant="caption" color="error.main">
            {`${result.message} Your message has been kept.`}
          </Typography>
        ) : null}
        {uploading ? (
          <Typography variant="caption" color="text.secondary">
            Waiting for attachments to finish uploading…
          </Typography>
        ) : null}
      </Box>
    </Paper>
  );
}
