import SendIcon from '@mui/icons-material/Send';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useAction } from '../../../foundation';

import { MentionTextInput, type MentionCandidate } from '../MentionTextInput/MentionTextInput';

export interface CommentInputBarProps {
  value: string;
  authorAvatarUri?: string;
  replyingTo?: string;
  mentionCandidates: MentionCandidate[];
  maxLength?: number;
  onChange: (value: string) => void;
  onQueryChange: (query: string | null) => void;
  onSubmit: (body: string) => Promise<void>;
}

/**
 * The comment composer.
 *
 * Composes `MentionTextInput` rather than owning a second mention
 * implementation. The counter appears only near the limit — a character count
 * shown from the first keystroke is pressure nobody asked for.
 */
export function CommentInputBar({
  value,
  authorAvatarUri,
  replyingTo,
  mentionCandidates,
  maxLength = 1000,
  onChange,
  onQueryChange,
  onSubmit,
}: CommentInputBarProps) {
  const [result, submit, pending] = useAction<string, 'posted'>(async (_previous, body) => {
    await onSubmit(body);
    return 'posted';
  });

  const remaining = maxLength - value.length;
  const tooLong = remaining < 0;
  const canSubmit = value.trim() !== '' && !tooLong && !pending;

  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start">
      <Avatar src={authorAvatarUri} alt="" sx={{ width: 32, height: 32, mt: 0.5 }} />

      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <MentionTextInput
          value={value}
          placeholder={replyingTo === undefined ? 'Add a comment' : `Reply to ${replyingTo}`}
          candidates={mentionCandidates}
          onChange={onChange}
          onQueryChange={onQueryChange}
        />

        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
          <Box aria-live="polite" sx={{ flexGrow: 1 }}>
            {result.status === 'error' ? (
              <Typography variant="caption" color="error.main">
                {`${result.message} Your comment has been kept.`}
              </Typography>
            ) : null}
            {result.status === 'success' ? (
              <Typography variant="caption" color="success.main">
                Comment posted
              </Typography>
            ) : null}
          </Box>

          {/* Only near the limit. A counter from the first keystroke is
              pressure nobody asked for. */}
          {remaining <= 100 ? (
            <Typography variant="caption" color={tooLong ? 'error.main' : 'text.secondary'}>
              {remaining}
            </Typography>
          ) : null}

          <IconButton
            size="small"
            color="primary"
            aria-label="Post comment"
            disabled={!canSubmit}
            onClick={() => {
              submit(value.trim());
            }}
          >
            {pending ? <CircularProgress size={18} /> : <SendIcon fontSize="small" />}
          </IconButton>
        </Stack>
      </Box>
    </Stack>
  );
}
